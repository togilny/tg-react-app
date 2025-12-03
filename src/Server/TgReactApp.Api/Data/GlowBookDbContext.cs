using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Data;

public class GlowBookDbContext : DbContext
{
    public GlowBookDbContext(DbContextOptions<GlowBookDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Specialist> Specialists { get; set; }
    public DbSet<Service> Services { get; set; }
    public DbSet<Client> Clients { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<ClientServicePrice> ClientServicePrices { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.Username).IsUnique();
        });

        // Specialist configuration
        modelBuilder.Entity<Specialist>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ImageUrl).HasColumnType("nvarchar(max)"); // Allow base64 data URLs which can be very long
            entity.Property(e => e.PricePerHour).HasPrecision(18, 2);
            entity.Property(e => e.Rating).HasDefaultValue(5);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        // Service configuration
        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.HasOne<Specialist>().WithMany().HasForeignKey(e => e.SpecialistId).OnDelete(DeleteBehavior.SetNull);
        });

        // Client configuration
        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // Booking configuration
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Service).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Confirmed");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Specialist>().WithMany().HasForeignKey(e => e.SpecialistId).OnDelete(DeleteBehavior.Restrict);
        });

        // ClientServicePrice configuration
        modelBuilder.Entity<ClientServicePrice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomPrice).HasPrecision(18, 2);
            entity.HasOne<Client>().WithMany().HasForeignKey(e => e.ClientId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Service>().WithMany().HasForeignKey(e => e.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.ClientId, e.ServiceId }).IsUnique();
        });
    }
}

