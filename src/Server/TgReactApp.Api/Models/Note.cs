namespace TgReactApp.Api.Models;

/// <summary>
/// Represents a note belonging to a user.
/// </summary>
public sealed record Note(
    Guid Id,
    Guid UserId,
    string Title,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt);

