namespace TgReactApp.Api.Contracts;

public sealed record UpdateUserRequest
{
    public string? Username { get; init; }
    public string? DisplayName { get; init; }
    public string? Password { get; init; }
}

