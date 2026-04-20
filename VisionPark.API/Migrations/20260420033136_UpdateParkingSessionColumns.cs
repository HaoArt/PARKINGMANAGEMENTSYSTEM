using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateParkingSessionColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TimeOut",
                table: "ParkingSessions",
                newName: "CheckOutTime");

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckInTime",
                table: "ParkingSessions",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "LicensePlateIn",
                table: "ParkingSessions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LicensePlateOut",
                table: "ParkingSessions",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckInTime",
                table: "ParkingSessions");

            migrationBuilder.DropColumn(
                name: "LicensePlateIn",
                table: "ParkingSessions");

            migrationBuilder.DropColumn(
                name: "LicensePlateOut",
                table: "ParkingSessions");

            migrationBuilder.RenameColumn(
                name: "CheckOutTime",
                table: "ParkingSessions",
                newName: "TimeOut");
        }
    }
}
