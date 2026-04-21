using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5295);
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
 

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowIonicApp", policy =>
    {
        policy.WithOrigins("http://localhost:8100") // URL của ứng dụng Ionic
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()    
              .AllowAnyMethod()    
              .AllowAnyHeader();   
    });
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var app = builder.Build();

app.UseCors("AllowAll");
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseCors("AllowIonicApp");

app.UseAuthorization();
app.MapControllers();
app.Run();