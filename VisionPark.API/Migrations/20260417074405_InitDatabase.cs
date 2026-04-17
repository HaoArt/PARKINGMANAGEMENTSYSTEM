using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class InitDatabase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFCCards",
                columns: table => new
                {
                    CardID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CardUID = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFCCards", x => x.CardID);
                });

            migrationBuilder.CreateTable(
                name: "SystemConfigs",
                columns: table => new
                {
                    ConfigKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ConfigValue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DataType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConfigGrpup = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemConfigs", x => x.ConfigKey);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UsertId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreateAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UsertId);
                });

            migrationBuilder.CreateTable(
                name: "VerhicleTypes",
                columns: table => new
                {
                    TypeID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TypeName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerhicleTypes", x => x.TypeID);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    LogID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserID = table.Column<int>(type: "int", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TableName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecordID = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.LogID);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_UserID",
                        column: x => x.UserID,
                        principalTable: "Users",
                        principalColumn: "UsertId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MonthlyTickets",
                columns: table => new
                {
                    TicketId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CardID = table.Column<int>(type: "int", nullable: false),
                    VehicleTypeID = table.Column<int>(type: "int", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RegisterPlate = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyTickets", x => x.TicketId);
                    table.ForeignKey(
                        name: "FK_MonthlyTickets_NFCCards_CardID",
                        column: x => x.CardID,
                        principalTable: "NFCCards",
                        principalColumn: "CardID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MonthlyTickets_VerhicleTypes_VehicleTypeID",
                        column: x => x.VehicleTypeID,
                        principalTable: "VerhicleTypes",
                        principalColumn: "TypeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PricingRules",
                columns: table => new
                {
                    RuleID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VehicleTypeID = table.Column<int>(type: "int", nullable: false),
                    RuleType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BasePrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    BlockMinutes = table.Column<int>(type: "int", nullable: true),
                    PricePerBlock = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ApplyFromTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    ApplyToTime = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingRules", x => x.RuleID);
                    table.ForeignKey(
                        name: "FK_PricingRules_VerhicleTypes_VehicleTypeID",
                        column: x => x.VehicleTypeID,
                        principalTable: "VerhicleTypes",
                        principalColumn: "TypeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParkingSessions",
                columns: table => new
                {
                    SessionID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CardID = table.Column<int>(type: "int", nullable: false),
                    VehicleTypeID = table.Column<int>(type: "int", nullable: false),
                    TicketID = table.Column<int>(type: "int", nullable: true),
                    TimeIn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PlateNumberIn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageInPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserInID = table.Column<int>(type: "int", nullable: false),
                    TimeOut = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PlateNumberOut = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageOutPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserOutID = table.Column<int>(type: "int", nullable: true),
                    TotalCost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsPlateMatch = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParkingSessions", x => x.SessionID);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_MonthlyTickets_TicketID",
                        column: x => x.TicketID,
                        principalTable: "MonthlyTickets",
                        principalColumn: "TicketId");
                    table.ForeignKey(
                        name: "FK_ParkingSessions_NFCCards_CardID",
                        column: x => x.CardID,
                        principalTable: "NFCCards",
                        principalColumn: "CardID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_Users_UserInID",
                        column: x => x.UserInID,
                        principalTable: "Users",
                        principalColumn: "UsertId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_Users_UserOutID",
                        column: x => x.UserOutID,
                        principalTable: "Users",
                        principalColumn: "UsertId");
                    table.ForeignKey(
                        name: "FK_ParkingSessions_VerhicleTypes_VehicleTypeID",
                        column: x => x.VehicleTypeID,
                        principalTable: "VerhicleTypes",
                        principalColumn: "TypeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserID",
                table: "AuditLogs",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyTickets_CardID",
                table: "MonthlyTickets",
                column: "CardID");

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyTickets_VehicleTypeID",
                table: "MonthlyTickets",
                column: "VehicleTypeID");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_CardID",
                table: "ParkingSessions",
                column: "CardID");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_TicketID",
                table: "ParkingSessions",
                column: "TicketID");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_UserInID",
                table: "ParkingSessions",
                column: "UserInID");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_UserOutID",
                table: "ParkingSessions",
                column: "UserOutID");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_VehicleTypeID",
                table: "ParkingSessions",
                column: "VehicleTypeID");

            migrationBuilder.CreateIndex(
                name: "IX_PricingRules_VehicleTypeID",
                table: "PricingRules",
                column: "VehicleTypeID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "ParkingSessions");

            migrationBuilder.DropTable(
                name: "PricingRules");

            migrationBuilder.DropTable(
                name: "SystemConfigs");

            migrationBuilder.DropTable(
                name: "MonthlyTickets");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "NFCCards");

            migrationBuilder.DropTable(
                name: "VerhicleTypes");
        }
    }
}
