using TgReactApp.Api.Contracts;
using TgReactApp.Api.Repositories;
using TgReactApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Register repositories and services
builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
builder.Services.AddSingleton<INoteRepository, InMemoryNoteRepository>();
builder.Services.AddSingleton<IAuthService, SimpleAuthService>();
builder.Services.AddSingleton<ITodoRepository, InMemoryTodoRepository>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("spa");

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

// Authentication endpoints
var auth = app.MapGroup("/api/auth").WithTags("Auth");

auth.MapPost("/register", (RegisterRequest request, IUserRepository userRepo, IAuthService authService) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || request.Username.Length < 3)
    {
        return Results.BadRequest(new { message = "Username must be at least 3 characters." });
    }

    if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
    {
        return Results.BadRequest(new { message = "Password must be at least 6 characters." });
    }

    if (userRepo.GetByUsername(request.Username) != null)
    {
        return Results.BadRequest(new { message = "Username already exists." });
    }

    var passwordHash = authService.HashPassword(request.Password);
    var user = userRepo.Create(request.Username, passwordHash);
    var token = authService.GenerateToken(user);

    return Results.Ok(new { token, username = user.Username, userId = user.Id });
});

auth.MapPost("/login", (LoginRequest request, IUserRepository userRepo, IAuthService authService) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Username and password are required." });
    }

    var user = userRepo.GetByUsername(request.Username);
    if (user == null || !authService.VerifyPassword(request.Password, user.PasswordHash))
    {
        return Results.Unauthorized();
    }

    var token = authService.GenerateToken(user);
    return Results.Ok(new { token, username = user.Username, userId = user.Id });
});

// Notes endpoints
var notes = app.MapGroup("/api/notes").WithTags("Notes");

notes.MapGet("/", (HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var results = repository.GetAllByUser(userId.Value);
    return Results.Ok(results);
});

notes.MapGet("/{id:guid}", (Guid id, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var note = repository.GetById(id, userId.Value);
    return note is null ? Results.NotFound() : Results.Ok(note);
});

notes.MapPost("/", (CreateNoteRequest request, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var note = repository.Add(userId.Value, request.Title, request.Content ?? string.Empty);
    return Results.Created($"/api/notes/{note.Id}", note);
});

notes.MapPut("/{id:guid}", (Guid id, UpdateNoteRequest request, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var updated = repository.Update(id, userId.Value, request.Title, request.Content ?? string.Empty);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

notes.MapDelete("/{id:guid}", (Guid id, HttpContext context, INoteRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var deleted = repository.Delete(id, userId.Value);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Keep old todos endpoint for backward compatibility (optional)
var todos = app.MapGroup("/api/todos").WithTags("Todos");

todos.MapGet("/", (ITodoRepository repository) =>
{
    var results = repository.GetAll();
    return Results.Ok(results);
});

todos.MapGet("/{id:guid}", (Guid id, ITodoRepository repository) =>
{
    var todo = repository.GetById(id);
    return todo is null ? Results.NotFound() : Results.Ok(todo);
});

todos.MapPost("/", (CreateTodoRequest request, ITodoRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var todo = repository.Add(request.Title, request.Description);
    return Results.Created($"/api/todos/{todo.Id}", todo);
});

todos.MapPut("/{id:guid}", (Guid id, UpdateTodoRequest request, ITodoRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var updated = repository.Update(id, request.Title, request.Description, request.IsComplete);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

todos.MapDelete("/{id:guid}", (Guid id, ITodoRepository repository) =>
{
    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

app.Run();
