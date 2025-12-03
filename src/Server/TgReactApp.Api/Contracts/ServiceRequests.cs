namespace TgReactApp.Api.Contracts;

public record CreateServiceRequest(
    string Name,
    string Category,
    int DurationMinutes,
    decimal Price,
    string? Description
);

public record UpdateServiceRequest(
    string Name,
    string Category,
    int DurationMinutes,
    decimal Price,
    string? Description
);

