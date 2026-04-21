using Microsoft.EntityFrameworkCore;
using VisionPark.API.Data;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// THÊM ĐOẠN NÀY ĐỂ MỞ KHÓA CORS CHO IONIC
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowIonicApp", policy =>
    {
        policy.WithOrigins("http://localhost:8100") // URL của ứng dụng Ionic
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Thêm các dịch vụ cơ bản
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

// KÍCH HOẠT CORS TẠI ĐÂY (Phải đặt trước UseAuthorization)
app.UseCors("AllowIonicApp");

app.UseAuthorization();
app.MapControllers();
app.Run();