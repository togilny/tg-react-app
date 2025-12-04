namespace TgReactApp.Api.Models;

/// <summary>
/// Represents a user account. Merged with Client and Specialist functionality.
/// Use IsSpecialist flag to identify specialists.
/// </summary>
public class User
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsSpecialist { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Client fields (merged from Client model)
    public string? Name { get; set; } // Client name (can be different from DisplayName)
    public string? Email { get; set; } // Client email
    public string? Phone { get; set; } // Client phone
    public string? Notes { get; set; } // Client notes
    
    // Specialist fields (merged from Specialist model) - only populated when IsSpecialist = true
    public string? Category { get; set; } // "Hair", "Nails", "Makeup" - specialist category
    public string? Description { get; set; } // Specialist description
    public string? ImageUrl { get; set; } // Specialist image URL
    public decimal? PricePerHour { get; set; } // Specialist price per hour
    public int? Rating { get; set; } // Specialist rating (1-5)
}


