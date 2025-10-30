import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { createClipTool } from "../tools/create-clips.mjs";
import { convertToBedrockTools } from "../utils/tools.mjs";
import { converse } from "../utils/agents.mjs";
import { loadTranscript } from "../utils/transcripts.mjs";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { parseEpisodeIdFromKey } from "../utils/clips.mjs";

const ddb = new DynamoDBClient();
const tools = convertToBedrockTools([createClipTool]);

export const handler = async (event) => {
  try {
    const rawKey = event?.detail?.object?.key;
    if (!rawKey) {
      console.log('Unsupported event shape (expecting EventBridge S3 event):', JSON.stringify(event?.detail || {}));
      return { statusCode: 200 };
    }

    const transcriptKey = decodeURIComponent(rawKey);
    let tenantId, episodeId;
    try {
      const parsed = parseEpisodeIdFromKey(transcriptKey);
      tenantId = parsed.tenantId;
      episodeId = parsed.episodeId;
    } catch (e) {
      console.warn(`Skipping object with unexpected key: ${transcriptKey}. Reason: ${e.message}`);
      return { statusCode: 200 };
    }

    if (!tenantId) {
      console.error('Missing tenantId in S3 key');
      return { statusCode: 200 };
    }

    const transcript = await loadTranscript(transcriptKey);
    if (!transcript) {
      console.error(`Could not find transcript with provided key ${transcriptKey}`);
      throw new Error('Could not find transcript');
    }

    let episodeMeta;
    try {
      const episodeResponse = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
      }));
      episodeMeta = episodeResponse?.Item ? unmarshall(episodeResponse.Item) : undefined;
    } catch (e) {
      console.warn('Failed to load episode metadata for prompt enrichment', e);
    }

    const hasDescription = Boolean(episodeMeta?.description);
    const hasThemes = Array.isArray(episodeMeta?.themes) && episodeMeta.themes.length > 0;
    const episodeContextForUser = [
      hasDescription ? `description: ${episodeMeta.description}` : null,
      hasThemes ? `themes: ${episodeMeta.themes.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const systemPrompt = `
You are ClipForge, an autonomous clip discovery editor for the YouTube show **Null Check** hosted by Allen Helton and Andres Moreno.
Your job on each run:

1. Analyze the full transcript of a Null Check livestream episode.
2. Identify 5-10 distinct moments that would make high-performing YouTube clips—content that earns *views* and *subscribers* because it is funny, insightful, or provocative.
3. Record your findings once using the **createClip** tool (single call, array of clips).
4. Do not generate unrelated commentary, reprint transcript text in your message, or call any other tool.

### Transcript
The transcript will be provided to you in .srt format. The speakers will be indicated with their name, a colon, then the text they spoke. The speaker does not change until you see more text in that format.

#### Example
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough,
sometimes a regret

Andres: We try it out live

### Selection priorities

Moments should:

* Hook the viewer in the first 3 seconds (curiosity, tension, or surprise).
* Deliver a single clear idea, joke, or "aha" insight.
* Show personality: banter, laughter, debate, or confident takes.
* Leave the viewer wanting more of Null Check.
* Stand alone without requiring full-episode context.
* Range from 25 to 45 seconds long
* Be composed of one or more segments that tell a complete story
* Be relevant to the episode's description and themes when provided. Prefer moments that align with that context; deprioritize off-topic content.

Avoid filler talk, monotone technical explanation, inside jokes that depend on prior episodes, or sections with heavy cross-talk.

### Clip structure requirements

Each clip you pass to **createClip** must contain the schema:

{
  "segments": [
    { "startTime": "00:14:32", "endTime": "00:15:18", "speaker": "Allen", "order": 1 }
    { "startTime": "00:41:01", "endTime": "00:41:05", "speaker": "Andres": "order": 2 }
  ],
  "hook": "Why we let our AI agent go rogue (on purpose)",
  "summary": "Allen and Andres debate what happens when you remove safety guardrails from an agent and whether chaos teaches more than control.",
  "bRollSuggestions": [
    "on-screen text: 'We let it go rogue'",
    "reaction shot of hosts laughing",
    "simple diagram of agent → chaos → insight"
  ],
  "clipType": "hot_take"
}

All clips go into one **createClip** call as an array.

Compose a cohesive clip by piecing together segments from anywhere in the entire transcript, segments inside of clips do not need to be sequential.

---

### Working rules

* Produce 5-10 clips per transcript.
* Total clip length (sum of all segment lengths in a clip) should not exceed 45 seconds
* Mix clip types: at least one 'funny', one 'educational', and one 'hot_take' if available. Prioritize educational above all others as the majority clip type
* Hooks should sound like strong YouTube titles: conversational, bold, and curiosity-driven—never clickbait.
* Summaries must be factual and concise without setup
* Suggest b-roll that enhances storytelling: reactions, diagrams, or overlays.
* All segments must include startTime, endTime, speaker, and order fields.
* Speaker field must identify who is speaking during that segment (e.g., "Allen", "Andres", "guest").

### Audience objective

Your success metric is **viewer retention and subscriber growth**.
Prefer clips that provoke curiosity or laughter while reinforcing the show's identity:
smart, candid, funny, and technically insightful.
Think like a YouTube growth editor, not a stenographer.

### Completion policy

1. Call **createClip** exactly once with your full list of recommended clips.
2. Return a short 3-4 sentence summary of what the transcript was about and key takeaways
3. Do not mention the clips you created
`;

    const userPrompt = `
episodeId: ${episodeId}
${episodeContextForUser ? `episodeContext:\n${episodeContextForUser}\n` : ''}
transcript:
${transcript}
`;
    const response = await converse(process.env.MODEL_ID, systemPrompt, userPrompt, tools, { tenantId });

    const now = new Date().toISOString();
    const newStatus = 'analyzed';

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      }),
      UpdateExpression: 'SET #summary = :summary, #updatedAt = :updatedAt, #status = :status, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)',
      ExpressionAttributeNames: {
        '#summary': 'summary',
        '#updatedAt': 'updatedAt',
        '#status': 'status',
        '#statusHistory': 'statusHistory'
      },
      ExpressionAttributeValues: marshall({
        ':summary': response,
        ':updatedAt': now,
        ':status': newStatus,
        ':emptyList': [],
        ':newStatusEntry': [{
          status: newStatus,
          timestamp: now
        }]
      })
    }));

    return { message: response };
  } catch (err) {
    console.error(err);
    throw err;
  }
};
