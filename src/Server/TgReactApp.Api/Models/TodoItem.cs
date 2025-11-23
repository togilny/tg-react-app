namespace TgReactApp.Api.Models;

/// <summary>
/// Represents a very small aggregate for a to-do item surfaced to the client.
/// </summary>
public sealed record TodoItem(
    Guid Id,
    string Title,
    string? Description,
    bool IsComplete,
    DateTime CreatedAt,
    DateTime? CompletedAt);

