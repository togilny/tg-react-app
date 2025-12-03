namespace TgReactApp.Api.Models;

/// <summary>
/// Represents a user account.
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
}


