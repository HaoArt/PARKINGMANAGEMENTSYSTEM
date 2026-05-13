using Microsoft.EntityFrameworkCore;
using VisionPark.API.Models;

namespace VisionPark.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

      
        public DbSet<User> Users { get; set; }
        public DbSet<VehicleType> VehicleTypes { get; set; }
        public DbSet<SystemConfig> SystemConfigs { get; set; }
        public DbSet<PricingRule> PricingRules { get; set; }
        public DbSet<ParkingSession> ParkingSessions { get; set; }
        public DbSet<NfcCard> NfcCards { get; set; }
        public DbSet<MonthlyTicket> MonthlyTickets { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<FaceRecord> FaceRecords { get; set; }

       
    }
}