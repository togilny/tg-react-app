namespace TgReactApp.Api.Models;

/// <summary>
/// Represents a user account.
/// </summary>
public sealed record User(
    Guid Id,
    string Username,
    string PasswordHash,
    DateTime CreatedAt);

