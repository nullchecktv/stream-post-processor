import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Get the FFmpeg binary path (from Lambda layer or system)
 */
const getFFmpegPath = () => {
  // In Lambda with layer, FFmpeg is at /opt/bin/ffmpeg
  // For local development, fall back to system ffmpeg
  return process.env.AWS_LAMBDA_FUNCTION_NAME ? '/opt/bin/ffmpeg' : 'ffmpeg';
};

/**
 * Get the FFprobe binary path (from Lambda layer or system)
 */
const getFFprobePath = () => {
  // In Lambda with layer, FFprobe is at /opt/bin/ffprobe
  // For local development, fall back to system ffprobe
  return process.env.AWS_LAMBDA_FUNCTION_NAME ? '/opt/bin/ffprobe' : 'ffprobe';
};

/**
 * Execute FFmpeg command with proper error handling
 * @param {Array} args - FFmpeg command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<string>} - Command output
 */
export const execFFmpeg = (args, options = {}) => {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath();
    console.log('Executing FFmpeg command:', [ffmpegPath, ...args].join(' '));

    const ffmpeg = spawn(ffmpegPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      cwd: options.cwd || '/tmp',
      ...options
    });

    let stdout = '';
    let stderr = '';

    ffmpeg.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('FFmpeg command completed successfully');
        resolve(stdout);
      } else {
        console.error('FFmpeg command failed:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      console.error('FFmpeg spawn error:', error);
      reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
    });
  });
};

/**
 * Extract video segment from source file using FFmpeg
 * @param {string} inputFile - Path to input video file
 * @param {string} outputFile - Path to output video file
 * @param {number} startOffset - Start time offset in seconds
 * @param {number} duration - Duration to extract in seconds
 * @returns {Promise<void>}
 */
export const extractVideoSegment = async (inputFile, outputFile, startOffset, duration) => {
  console.log(`Extracting segment: input=${inputFile}, output=${outputFile}, start=${startOffset}s, duration=${duration}s`);

  // First, let's get info about the input file
  try {
    const inputInfo = await getVideoInfo(inputFile);
    const inputDuration = parseFloat(inputInfo.format?.duration || 0);
    console.log(`Input file duration: ${inputDuration}s`);

    if (startOffset >= inputDuration) {
      throw new Error(`Start offset (${startOffset}s) is beyond input duration (${inputDuration}s)`);
    }

    if (startOffset + duration > inputDuration) {
      const adjustedDuration = inputDuration - startOffset;
      console.log(`Adjusting duration from ${duration}s to ${adjustedDuration}s to fit input file`);
      duration = adjustedDuration;
    }
  } catch (infoError) {
    console.warn('Could not get input file info:', infoError.message);
  }

  // Use more robust FFmpeg parameters
  const args = [
    '-i', inputFile,
    '-ss', startOffset.toString(),
    '-t', duration.toString(),
    '-c:v', 'libx264',  // Re-encode video to ensure compatibility
    '-c:a', 'aac',      // Re-encode audio to ensure compatibility
    '-preset', 'fast',  // Fast encoding preset
    '-crf', '23',       // Good quality setting
    '-avoid_negative_ts', 'make_zero',
    '-y', // Overwrite output file
    outputFile
  ];

  console.log('FFmpeg command:', args.join(' '));

  try {
    await execFFmpeg(args);
  } catch (error) {
    console.warn('Re-encoding failed, trying with stream copy:', error.message);

    // Fallback to stream copy
    const fallbackArgs = [
      '-i', inputFile,
      '-ss', startOffset.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-y',
      outputFile
    ];

    console.log('Fallback FFmpeg command:', fallbackArgs.join(' '));
    await execFFmpeg(fallbackArgs);
  }

  // Verify the output file
  try {
    const outputInfo = await getVideoInfo(outputFile);
    const outputDuration = parseFloat(outputInfo.format?.duration || 0);
    const hasVideo = outputInfo.streams?.some(s => s.codec_type === 'video') || false;
    const hasAudio = outputInfo.streams?.some(s => s.codec_type === 'audio') || false;

    console.log(`Output file: duration=${outputDuration}s, hasVideo=${hasVideo}, hasAudio=${hasAudio}`);

    if (outputDuration === 0) {
      throw new Error('Output file has zero duration');
    }

    if (!hasVideo) {
      console.warn('Output file has no video stream');
    }

    if (!hasAudio) {
      console.warn('Output file has no audio stream');
    }
  } catch (verifyError) {
    console.warn('Could not verify output file:', verifyError.message);
  }
};

/**
 * Get video file information using FFprobe
 * @param {string} filePath - Path to video file
 * @returns {Promise<Object>} Video information
 */
export const getVideoInfo = async (filePath) => {
  return new Promise((resolve, reject) => {
    const ffprobePath = getFFprobePath();
    console.log('Executing FFprobe command:', [ffprobePath, filePath].join(' '));

    const ffprobe = spawn(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ], {
      env: process.env,
      cwd: '/tmp'
    });

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          resolve(info);
        } catch (error) {
          reject(new Error(`Failed to parse FFprobe output: ${error.message}`));
        }
      } else {
        reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`Failed to spawn FFprobe: ${error.message}`));
    });
  });
};

/**
 * Create a temporary directory for processing
 * @param {string} prefix - Directory name prefix
 * @returns {Promise<string>} Path to created directory
 */
export const createTempDir = async (prefix = 'ffmpeg-') => {
  const tempDir = join('/tmp', `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
};

/**
 * Clean up temporary files and directories
 * @param {string} path - Path to clean up
 * @returns {Promise<void>}
 */
export const cleanup = async (path) => {
  try {
    const stat = await fs.stat(path);
    if (stat.isDirectory()) {
      await fs.rmdir(path, { recursive: true });
    } else {
      await fs.unlink(path);
    }
    console.log(`Cleaned up: ${path}`);
  } catch (error) {
    console.warn(`Failed to cleanup ${path}:`, error.message);
  }
};

/**
 * Ensure FFmpeg is available and get version
 * @returns {Promise<string>} FFmpeg version
 */
export const checkFFmpegAvailability = async () => {
  try {
    const ffmpegPath = getFFmpegPath();

    // Log environment information for debugging
    console.log('Environment info:', {
      architecture: process.arch,
      platform: process.platform,
      lambdaFunction: process.env.AWS_LAMBDA_FUNCTION_NAME,
      ffmpegPath
    });

    // Check if the binary exists
    try {
      await fs.access(ffmpegPath, fs.constants.F_OK);
      console.log(`FFmpeg binary found at: ${ffmpegPath}`);

      // Check if binary is executable
      await fs.access(ffmpegPath, fs.constants.X_OK);
      console.log(`FFmpeg binary is executable`);
    } catch (accessError) {
      throw new Error(`FFmpeg binary not accessible at ${ffmpegPath}: ${accessError.message}`);
    }

    // Get version information
    const output = await execFFmpeg(['-version']);
    const versionMatch = output.match(/ffmpeg version ([^\s]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    console.log(`FFmpeg version: ${version}`);
    return version;
  } catch (error) {
    console.error('FFmpeg availability check failed:', error);
    throw new Error(`FFmpeg is not available or not properly installed: ${error.message}`);
  }
};
