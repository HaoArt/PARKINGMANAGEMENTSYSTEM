using System;

namespace VisionPark.API.Models // Chỉnh sửa lại namespace
{
    public class FaceRecord
    {
        public int Id { get; set; }
        public string ImageData { get; set; }
        public int FaceCount { get; set; }
        public DateTime ScanTime { get; set; }
    }
}
