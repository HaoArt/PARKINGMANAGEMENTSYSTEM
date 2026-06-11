# 1. Môi trường Build code (.NET 8 SDK)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy file csproj và restore các thư viện (NuGet)
COPY ["VisionPark.API.csproj", "./"]
RUN dotnet restore "VisionPark.API.csproj"

# Copy toàn bộ code còn lại và Publish
COPY . .
RUN dotnet publish "VisionPark.API.csproj" -c Release -o /app/publish /p:UseAppHost=false /p:ErrorOnDuplicatePublishOutputFiles=false

# 2. Môi trường Chạy ứng dụng (.NET 8 Runtime siêu nhẹ)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Cài đặt các thư viện hệ thống của Linux bắt buộc phải có cho FaceRecognitionDotNet/Dlib
RUN apt-get update && apt-get install -y \
    libopenblas-dev \
    liblapack-dev \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

# Copy code đã publish từ bước Build sang
COPY --from=build /app/publish .

# Mở cổng 8080 cho Render
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Chạy ứng dụng
ENTRYPOINT ["dotnet", "VisionPark.API.dll"]