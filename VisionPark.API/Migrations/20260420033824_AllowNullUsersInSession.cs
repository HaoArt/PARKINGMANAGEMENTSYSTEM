using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VisionPark.API.Migrations
{
    /// <inheritdoc />
    public partial class AllowNullUsersInSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParkingSessions_Users_UserInID",
                table: "ParkingSessions");

            migrationBuilder.AlterColumn<int>(
                name: "UserInID",
                table: "ParkingSessions",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_ParkingSessions_Users_UserInID",
                table: "ParkingSessions",
                column: "UserInID",
                principalTable: "Users",
                principalColumn: "UsertId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParkingSessions_Users_UserInID",
                table: "ParkingSessions");

            migrationBuilder.AlterColumn<int>(
                name: "UserInID",
                table: "ParkingSessions",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ParkingSessions_Users_UserInID",
                table: "ParkingSessions",
                column: "UserInID",
                principalTable: "Users",
                principalColumn: "UsertId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
