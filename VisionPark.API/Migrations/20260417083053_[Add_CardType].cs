using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class Add_CardType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CardType",
                table: "NFCCards",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CardType",
                table: "NFCCards");
        }
    }
}
