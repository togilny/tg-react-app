using System.ComponentModel.DataAnnotations;

namespace TgReactApp.Api.Contracts;

public sealed record CreateTodoRequest
{
    [Required]
    [MaxLength(100)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; init; }
}

