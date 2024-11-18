using Microsoft.AspNetCore.Mvc;

namespace mPhotos.Controllers;

[ApiController]
[Route("[controller]")]
public class LibraryController : ControllerBase
{
    private static readonly string imgPath = @"/Users/magnusedetorn/Desktop/photosexport_20240921";

    private readonly ILogger<LibraryController> _logger;

    public LibraryController(ILogger<LibraryController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public LibraryMeta Get()
    {
        string[] fileNames = Directory.GetFiles(imgPath);
        return new LibraryMeta
        {
            LatestIndexTime = DateTime.Now,
            TotalPhotosNo = fileNames.Count(),
            TotalSizeMb = 100
        };
    }
}
