namespace mPhotos.Helpers
{
    public static class FileHelper
    {
        public static async Task<IEnumerable<FileInfo>> GetFileInfosRecursively(string directory) {
            var fileInfos = new List<FileInfo>();
            // Exclude dotfiles
            var files = new DirectoryInfo(directory)
                .GetFiles()
                .Where(x => !x.Name.FirstOrDefault().Equals('.'));
            fileInfos.AddRange(files);

            var dirs = Directory.GetDirectories(directory);
            foreach (var dir in dirs) {
                if (Directory.Exists(dir)){
                    fileInfos.AddRange(await GetFileInfosRecursively(dir));
                }
            }
            return fileInfos;
        }
    }
}