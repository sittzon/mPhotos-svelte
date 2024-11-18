namespace mPhotos;

public class PhotoMetaClient
{
    public required string Guid { get; set; }
    public int SizeKb { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTime? DateTaken { get; set; }
    public string? Name { get; set; }
}
