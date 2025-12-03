namespace TgReactApp.Api.Models;

public class Service
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Category { get; set; } // "Hair", "Nails", "Makeup"
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public Guid? SpecialistId { get; set; } // Null for general services, set for specialist-specific services
    public Guid? CreatedByUserId { get; set; } // Tracks which user created this service
    public DateTime CreatedAt { get; set; }
}

