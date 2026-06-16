using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TicketPrice",
                table: "MonthlyTickets",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TicketPrice",
                table: "MonthlyTickets");
        }
    }
}
