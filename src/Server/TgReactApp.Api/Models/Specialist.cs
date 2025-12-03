namespace TgReactApp.Api.Models;

public class Specialist
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; } // Link to User if this specialist is a registered user
    public required string Name { get; set; }
    public required string Category { get; set; } // "Hair", "Nails", "Makeup"
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public decimal PricePerHour { get; set; }
    public int Rating { get; set; } // 1-5
    public DateTime CreatedAt { get; set; }
}

