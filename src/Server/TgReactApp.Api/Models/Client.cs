namespace TgReactApp.Api.Models;

public class Client
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ClientServicePrice
{
    public Guid Id { get; set; }
    public Guid ClientId { get; set; }
    public Guid ServiceId { get; set; }
    public decimal CustomPrice { get; set; }
    public DateTime CreatedAt { get; set; }
}

