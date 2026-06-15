using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAIColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FaceImageUrlIn",
                table: "ParkingSessions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FaceImageUrlOut",
                table: "ParkingSessions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleImageUrlIn",
                table: "ParkingSessions",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FaceImageUrlIn",
                table: "ParkingSessions");

            migrationBuilder.DropColumn(
                name: "FaceImageUrlOut",
                table: "ParkingSessions");

            migrationBuilder.DropColumn(
                name: "VehicleImageUrlIn",
                table: "ParkingSessions");
        }
    }
}
