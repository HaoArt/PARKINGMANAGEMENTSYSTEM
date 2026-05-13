using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MonthlyTickets_VerhicleTypes_VehicleTypeID",
                table: "MonthlyTickets");

            migrationBuilder.DropForeignKey(
                name: "FK_ParkingSessions_VerhicleTypes_VehicleTypeID",
                table: "ParkingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_PricingRules_VerhicleTypes_VehicleTypeID",
                table: "PricingRules");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VerhicleTypes",
                table: "VerhicleTypes");

            migrationBuilder.RenameTable(
                name: "VerhicleTypes",
                newName: "VehicleTypes");

            migrationBuilder.RenameColumn(
                name: "CreateAt",
                table: "Users",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "UsertId",
                table: "Users",
                newName: "UserID");

            migrationBuilder.AddColumn<string>(
                name: "FaceImageUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerMonth",
                table: "PricingRules",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerQuarter",
                table: "PricingRules",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerYear",
                table: "PricingRules",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VehicleTypes",
                table: "VehicleTypes",
                column: "TypeID");

            migrationBuilder.CreateTable(
                name: "Attendances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CheckInTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CheckOutTime = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Attendances_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FaceRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImageData = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FaceCount = table.Column<int>(type: "int", nullable: false),
                    ScanTime = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FaceRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attendances_UserId",
                table: "Attendances",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_MonthlyTickets_VehicleTypes_VehicleTypeID",
                table: "MonthlyTickets",
                column: "VehicleTypeID",
                principalTable: "VehicleTypes",
                principalColumn: "TypeID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParkingSessions_VehicleTypes_VehicleTypeID",
                table: "ParkingSessions",
                column: "VehicleTypeID",
                principalTable: "VehicleTypes",
                principalColumn: "TypeID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PricingRules_VehicleTypes_VehicleTypeID",
                table: "PricingRules",
                column: "VehicleTypeID",
                principalTable: "VehicleTypes",
                principalColumn: "TypeID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MonthlyTickets_VehicleTypes_VehicleTypeID",
                table: "MonthlyTickets");

            migrationBuilder.DropForeignKey(
                name: "FK_ParkingSessions_VehicleTypes_VehicleTypeID",
                table: "ParkingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_PricingRules_VehicleTypes_VehicleTypeID",
                table: "PricingRules");

            migrationBuilder.DropTable(
                name: "Attendances");

            migrationBuilder.DropTable(
                name: "FaceRecords");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VehicleTypes",
                table: "VehicleTypes");

            migrationBuilder.DropColumn(
                name: "FaceImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PricePerMonth",
                table: "PricingRules");

            migrationBuilder.DropColumn(
                name: "PricePerQuarter",
                table: "PricingRules");

            migrationBuilder.DropColumn(
                name: "PricePerYear",
                table: "PricingRules");

            migrationBuilder.RenameTable(
                name: "VehicleTypes",
                newName: "VerhicleTypes");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Users",
                newName: "CreateAt");

            migrationBuilder.RenameColumn(
                name: "UserID",
                table: "Users",
                newName: "UsertId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VerhicleTypes",
                table: "VerhicleTypes",
                column: "TypeID");

            migrationBuilder.AddForeignKey(
                name: "FK_MonthlyTickets_VerhicleTypes_VehicleTypeID",
                table: "MonthlyTickets",
                column: "VehicleTypeID",
                principalTable: "VerhicleTypes",
                principalColumn: "TypeID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParkingSessions_VerhicleTypes_VehicleTypeID",
                table: "ParkingSessions",
                column: "VehicleTypeID",
                principalTable: "VerhicleTypes",
                principalColumn: "TypeID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PricingRules_VerhicleTypes_VehicleTypeID",
                table: "PricingRules",
                column: "VehicleTypeID",
                principalTable: "VerhicleTypes",
                principalColumn: "TypeID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
