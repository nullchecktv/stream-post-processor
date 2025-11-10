function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="mb-8">
        <div className="h-9 bg-gray-200 rounded w-64 mb-2"></div>
        <div className="h-5 bg-gray-200 rounded w-96"></div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="h-7 bg-gray-200 rounded w-48 mb-6"></div>

        <div className="space-y-4 mb-6">
          <div>
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-64"></div>
          </div>

          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-48"></div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>

          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>

          <div>
            <div className="flex items-center">
              <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-96 mt-2 ml-6"></div>
          </div>

          <div className="flex justify-end">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-7 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="h-5 bg-gray-200 rounded w-80 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  )
}

export default ProfileSkeleton
