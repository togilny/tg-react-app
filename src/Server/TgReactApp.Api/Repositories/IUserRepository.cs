using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface IUserRepository
{
    User? GetByUsername(string username);
    User? GetById(Guid id);
    User Create(string username, string passwordHash);
}

