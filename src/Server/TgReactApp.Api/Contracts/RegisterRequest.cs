namespace TgReactApp.Api.Contracts;

public sealed record RegisterRequest(string Username, string Password, string? DisplayName = null, string? SpecialistCode = null);

