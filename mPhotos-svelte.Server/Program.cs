using Microsoft.AspNetCore.ResponseCompression;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddSwaggerGen();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

const string WebsiteClientOrigin = "website_client";
builder.Services.AddCors(options =>
{
    options.AddPolicy(WebsiteClientOrigin, policy =>
    {
        var website = builder.Configuration["Endpoints:Website"];
        if (website != null)
        {
            policy.WithOrigins(website).AllowAnyHeader().AllowAnyMethod();
        }
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
    options.AddPolicy("Access-Control-Allow-Origin", policy => {

        policy.AllowAnyOrigin();
    });
});
builder.Services.AddMemoryCache();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
} else {
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors(WebsiteClientOrigin);
app.UseResponseCompression();
app.UseResponseCaching();
app.MapControllers();
app.Run();
