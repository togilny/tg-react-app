namespace TgReactApp.Api.Contracts;

public record CreateClientRequest(
    string Name,
    string Email,
    string? Phone,
    string? Notes
);

public record UpdateClientRequest(
    string Name,
    string Email,
    string? Phone,
    string? Notes
);

public record SetClientServicePriceRequest(
    Guid ClientId,
    Guid ServiceId,
    decimal CustomPrice
);

