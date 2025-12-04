namespace TgReactApp.Api.Models;

/// <summary>
/// Service response DTO that includes specialist information
/// </summary>
public class ServiceResponse
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Category { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public Guid? SpecialistId { get; set; }
    public string? SpecialistDisplayName { get; set; } // Display name from User (the specialist)
    public Guid? CreatedByUserId { get; set; }
    public string? CreatedByDisplayName { get; set; } // Display name of the user who created the service
    public DateTime CreatedAt { get; set; }
}

