using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface INoteRepository
{
    IReadOnlyCollection<Note> GetAllByUser(Guid userId);
    Note? GetById(Guid id, Guid userId);
    Note Add(Guid userId, string title, string content);
    Note? Update(Guid id, Guid userId, string title, string content);
    bool Delete(Guid id, Guid userId);
}

