using Microsoft.AspNetCore.Mvc;
using mPhotos.Helpers;

namespace mPhotos.Controllers;

[ApiController]
[Route("[controller]")]
public class LibraryController : ControllerBase
{
    private static readonly string imgPath = @"/originals";

    private readonly ILogger<LibraryController> _logger;

    public LibraryController(ILogger<LibraryController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public async Task<LibraryMeta> Get()
    {
        var originalPhotos = await FileHelper.GetFileInfosRecursively(imgPath);
        originalPhotos = originalPhotos.Where(x => x.Extension.ToLower().Equals(".jpg") || x.Extension.ToLower().Equals(".jpeg"));

        return new LibraryMeta
        {
            LatestIndexTime = DateTime.Now,
            TotalPhotosNo = originalPhotos.Count(),
            TotalSizeMb = 100
        };
    }
}
