using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFaceToTicket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FaceImageUrl",
                table: "MonthlyTickets",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FaceImageUrl",
                table: "MonthlyTickets");
        }
    }
}
