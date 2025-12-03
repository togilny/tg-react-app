using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TgReactApp.Api.Contracts;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;
using TgReactApp.Api.Repositories;
using TgReactApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

// Configure Entity Framework with SQL Server LocalDB
builder.Services.AddDbContext<GlowBookDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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

// Register repositories and services - Using EF Core for database persistence
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<INoteRepository, InMemoryNoteRepository>(); // Keep notes in-memory for now
builder.Services.AddSingleton<IAuthService, SimpleAuthService>();
builder.Services.AddScoped<ITodoRepository, InMemoryTodoRepository>(); // Keep todos in-memory for now
builder.Services.AddScoped<ISpecialistRepository, EfSpecialistRepository>();
builder.Services.AddScoped<IBookingRepository, EfBookingRepository>();
builder.Services.AddScoped<IServiceRepository, EfServiceRepository>();
builder.Services.AddScoped<IClientRepository, EfClientRepository>();
builder.Services.AddScoped<IClientServicePriceRepository, EfClientServicePriceRepository>();

var app = builder.Build();

// Ensure database is created and migrated
try
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<GlowBookDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        logger.LogInformation("Initializing database...");
        
        // In development, drop and recreate database to apply schema changes
        // This ensures the database always matches the current model
        if (app.Environment.IsDevelopment())
        {
            logger.LogInformation("Development mode: Recreating database with latest schema...");
            try
            {
                dbContext.Database.EnsureDeleted();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not delete existing database (may not exist): {Message}", ex.Message);
            }
        }
        
        dbContext.Database.EnsureCreated();
        
        // Ensure database is in MULTI_USER mode so SSMS can access it
        try
        {
            dbContext.Database.ExecuteSqlRaw("IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'GlowBookDb' AND user_access_desc = 'SINGLE_USER') ALTER DATABASE GlowBookDb SET MULTI_USER");
            logger.LogInformation("Database set to MULTI_USER mode.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not set database to MULTI_USER mode: {Message}", ex.Message);
        }
        
        logger.LogInformation("Database ready!");
        
        // Seed initial data if database is empty
        try
        {
            if (!dbContext.Specialists.Any())
            {
                logger.LogInformation("Seeding initial data...");
                SeedInitialData(dbContext);
                logger.LogInformation("Initial data seeded!");
            }
        }
        catch (Exception seedEx)
        {
            logger.LogError(seedEx, "Error seeding data: {Message}", seedEx.Message);
        }
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Error initializing database: {Message}", ex.Message);
    logger.LogError("Stack trace: {StackTrace}", ex.StackTrace);
    // Continue anyway - might be a connection issue that will resolve
}

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

auth.MapPost("/register", (RegisterRequest request, HttpContext context, IUserRepository userRepo, ISpecialistRepository specialistRepo, IAuthService authService) =>
{
    try
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

        // Validate specialist code if provided
        bool isSpecialist = false;
        if (!string.IsNullOrWhiteSpace(request.SpecialistCode))
        {
            var configuration = context.RequestServices.GetRequiredService<IConfiguration>();
            var validCode = configuration["SpecialistRegistrationCode"];
            if (string.IsNullOrWhiteSpace(validCode) || !request.SpecialistCode.Equals(validCode, StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(new { message = "Invalid specialist registration code." });
            }
            
            if (string.IsNullOrWhiteSpace(request.DisplayName))
            {
                return Results.BadRequest(new { message = "Display name is required when registering as a specialist." });
            }
            
            isSpecialist = true;
        }

        var passwordHash = authService.HashPassword(request.Password);
        var user = userRepo.Create(request.Username, passwordHash, request.DisplayName, isSpecialist);

        // If user is a specialist (valid code provided), create a Specialist profile
        if (isSpecialist && !string.IsNullOrWhiteSpace(request.DisplayName))
        {
            specialistRepo.Add(
                name: request.DisplayName,
                category: "General", // Default category, can be changed later
                description: null,
                imageUrl: null,
                pricePerHour: 50, // Default price, can be changed later
                rating: 5, // Default rating
                userId: user.Id // Link specialist to user
            );
        }

        var token = authService.GenerateToken(user);

        return Results.Ok(new { token, username = user.Username, userId = user.Id, isAdmin = user.IsAdmin, isSpecialist = user.IsSpecialist, displayName = user.DisplayName });
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Registration error: {Message}\n{StackTrace}", ex.Message, ex.StackTrace);
        return Results.Problem(
            detail: ex.Message + (ex.InnerException != null ? " - " + ex.InnerException.Message : ""),
            statusCode: 500,
            title: "Registration failed"
        );
    }
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
    return Results.Ok(new { token, username = user.Username, userId = user.Id, isAdmin = user.IsAdmin, isSpecialist = user.IsSpecialist, displayName = user.DisplayName });
});

// User profile endpoints
var users = app.MapGroup("/api/users").WithTags("Users");

users.MapGet("/me", (HttpContext context, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.NotFound();

    return Results.Ok(new { 
        id = user.Id, 
        username = user.Username, 
        displayName = user.DisplayName, 
        isAdmin = user.IsAdmin, 
        isSpecialist = user.IsSpecialist 
    });
});

users.MapPut("/me", (UpdateUserRequest request, HttpContext context, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.NotFound();

    string? passwordHash = null;
    if (!string.IsNullOrWhiteSpace(request.Password))
    {
        passwordHash = authService.HashPassword(request.Password);
    }

    var updated = userRepo.Update(userId.Value, request.Username, request.DisplayName, passwordHash);
    if (updated == null) return Results.NotFound();

    return Results.Ok(new { 
        id = updated.Id, 
        username = updated.Username, 
        displayName = updated.DisplayName, 
        isAdmin = updated.IsAdmin, 
        isSpecialist = updated.IsSpecialist 
    });
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

// Specialists endpoints - Public
var specialists = app.MapGroup("/api/specialists").WithTags("Specialists");

specialists.MapGet("/", (ISpecialistRepository repository, string? category) =>
{
    var results = string.IsNullOrWhiteSpace(category)
        ? repository.GetAll()
        : repository.GetByCategory(category);
    return Results.Ok(results);
});

specialists.MapGet("/{id:guid}", (Guid id, ISpecialistRepository repository) =>
{
    var specialist = repository.GetById(id);
    return specialist is null ? Results.NotFound() : Results.Ok(specialist);
});

// Get current user's specialist profile
specialists.MapGet("/my-profile", (HttpContext context, ISpecialistRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var specialist = repository.GetByUserId(userId.Value);
    return specialist is null ? Results.NotFound() : Results.Ok(specialist);
});

// Admin-only specialist management
specialists.MapPost("/", (CreateSpecialistRequest request, HttpContext context, ISpecialistRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Specialist name is required." });
    
    if (string.IsNullOrWhiteSpace(request.Category))
        return Results.BadRequest(new { message = "Category is required." });

    var specialist = repository.Add(request.Name, request.Category, request.Description, 
        request.ImageUrl, request.PricePerHour, request.Rating);
    return Results.Created($"/api/specialists/{specialist.Id}", specialist);
});

specialists.MapPut("/{id:guid}", (Guid id, UpdateSpecialistRequest request, HttpContext context, 
    ISpecialistRepository repository, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.Forbid();

    // Check if user is admin OR if they're updating their own specialist profile
    if (!user.IsAdmin)
    {
        if (!user.IsSpecialist) return Results.Forbid();
        
        // Verify the specialist profile belongs to this user
        var specialist = repository.GetByUserId(userId.Value);
        if (specialist == null || specialist.Id != id) return Results.Forbid();
    }

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Specialist name is required." });

    var updated = repository.Update(id, request.Name, request.Category, request.Description,
        request.ImageUrl, request.PricePerHour, request.Rating);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

specialists.MapDelete("/{id:guid}", (Guid id, HttpContext context, ISpecialistRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null) return Results.Forbid();

    // Check if user is admin OR if they're deleting their own specialist profile
    if (!user.IsAdmin)
    {
        if (!user.IsSpecialist) return Results.Forbid();
        
        // Verify the specialist profile belongs to this user
        var specialist = repository.GetByUserId(userId.Value);
        if (specialist == null || specialist.Id != id) return Results.Forbid();
    }

    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Bookings endpoints - Protected
var bookings = app.MapGroup("/api/bookings").WithTags("Bookings");

bookings.MapGet("/", (HttpContext context, IBookingRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var results = repository.GetAllByUser(userId.Value);
    return Results.Ok(results);
});

bookings.MapGet("/specialist/{specialistId:guid}/date/{date}", 
    (Guid specialistId, DateTime date, IBookingRepository repository) =>
{
    var results = repository.GetBySpecialist(specialistId, date);
    return Results.Ok(results);
});

bookings.MapPost("/", (CreateBookingRequest request, HttpContext context, IBookingRepository repository, 
    ISpecialistRepository specialistRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    // Validate specialist exists
    var specialist = specialistRepo.GetById(request.SpecialistId);
    if (specialist == null) return Results.BadRequest(new { message = "Specialist not found." });

    // Parse times
    if (!TimeSpan.TryParse(request.StartTime, out var startTime) ||
        !TimeSpan.TryParse(request.EndTime, out var endTime))
    {
        return Results.BadRequest(new { message = "Invalid time format." });
    }

    // Check for conflicts
    var existingBookings = repository.GetBySpecialist(request.SpecialistId, request.BookingDate);
    var hasConflict = existingBookings.Any(b => 
        (startTime >= b.StartTime && startTime < b.EndTime) ||
        (endTime > b.StartTime && endTime <= b.EndTime) ||
        (startTime <= b.StartTime && endTime >= b.EndTime));

    if (hasConflict)
    {
        return Results.BadRequest(new { message = "This time slot is already booked." });
    }

    var booking = repository.Add(userId.Value, request.SpecialistId, request.BookingDate, 
        startTime, endTime, request.Service, request.Notes);
    
    return Results.Created($"/api/bookings/{booking.Id}", booking);
});

bookings.MapDelete("/{id:guid}", (Guid id, HttpContext context, IBookingRepository repository, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var cancelled = repository.Cancel(id, userId.Value);
    return cancelled ? Results.NoContent() : Results.NotFound();
});

// Services endpoints - Public (read) and Admin (write)
var services = app.MapGroup("/api/services").WithTags("Services");

services.MapGet("/", (IServiceRepository repository, string? category) =>
{
    // Only return general services (not specialist-specific)
    var allServices = repository.GetAll().Where(s => s.SpecialistId == null).ToList();
    var results = string.IsNullOrWhiteSpace(category)
        ? allServices
        : allServices.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
    return Results.Ok(results);
});

services.MapGet("/{id:guid}", (Guid id, IServiceRepository repository) =>
{
    var service = repository.GetById(id);
    return service is null ? Results.NotFound() : Results.Ok(service);
});

// Get services for a specific specialist
services.MapGet("/by-specialist/{specialistId:guid}", (Guid specialistId, IServiceRepository repository, string? category) =>
{
    var specialistServices = repository.GetBySpecialist(specialistId);
    var results = string.IsNullOrWhiteSpace(category)
        ? specialistServices
        : specialistServices.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
    return Results.Ok(results);
});

// Admin-only endpoints
services.MapPost("/", (CreateServiceRequest request, HttpContext context, IServiceRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });
    
    if (request.DurationMinutes <= 0)
        return Results.BadRequest(new { message = "Duration must be greater than 0." });

    var service = repository.Add(request.Name, request.Category, request.DurationMinutes, request.Price, request.Description, null, userId.Value);
    return Results.Created($"/api/services/{service.Id}", service);
});

services.MapPut("/{id:guid}", (Guid id, UpdateServiceRequest request, HttpContext context, IServiceRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });

    var updated = repository.Update(id, request.Name, request.Category, request.DurationMinutes, request.Price, request.Description);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

services.MapDelete("/{id:guid}", (Guid id, HttpContext context, IServiceRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Specialist service management endpoints
services.MapGet("/my-services", (HttpContext context, IServiceRepository serviceRepo, ISpecialistRepository specialistRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var specialist = specialistRepo.GetByUserId(userId.Value);
    if (specialist == null) return Results.NotFound(new { message = "Specialist profile not found." });

    var myServices = serviceRepo.GetBySpecialist(specialist.Id);
    return Results.Ok(myServices);
});

services.MapPost("/my-services", (CreateServiceRequest request, HttpContext context, IServiceRepository serviceRepo, ISpecialistRepository specialistRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var specialist = specialistRepo.GetByUserId(userId.Value);
    if (specialist == null) return Results.NotFound(new { message = "Specialist profile not found." });

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });
    
    if (request.DurationMinutes <= 0)
        return Results.BadRequest(new { message = "Duration must be greater than 0." });

    // Check for duplicate service name for this specialist
    var existingServices = serviceRepo.GetBySpecialist(specialist.Id);
    if (existingServices.Any(s => s.Name.Equals(request.Name, StringComparison.OrdinalIgnoreCase) && s.SpecialistId == specialist.Id))
        return Results.BadRequest(new { message = "You already have a service with this name." });

    var service = serviceRepo.Add(request.Name, request.Category, request.DurationMinutes, request.Price, request.Description, specialist.Id, userId.Value);
    return Results.Created($"/api/services/{service.Id}", service);
});

services.MapPut("/my-services/{id:guid}", (Guid id, UpdateServiceRequest request, HttpContext context, IServiceRepository serviceRepo, ISpecialistRepository specialistRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var specialist = specialistRepo.GetByUserId(userId.Value);
    if (specialist == null) return Results.NotFound(new { message = "Specialist profile not found." });

    var service = serviceRepo.GetById(id);
    if (service == null) return Results.NotFound();
    if (service.SpecialistId != specialist.Id) return Results.Json(new { message = "You can only update your own services." }, statusCode: 403);

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Service name is required." });

    var updated = serviceRepo.Update(id, request.Name, request.Category, request.DurationMinutes, request.Price, request.Description, specialist.Id);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

services.MapDelete("/my-services/{id:guid}", (Guid id, HttpContext context, IServiceRepository serviceRepo, ISpecialistRepository specialistRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsSpecialist) return Results.Forbid();

    var specialist = specialistRepo.GetByUserId(userId.Value);
    if (specialist == null) return Results.NotFound(new { message = "Specialist profile not found." });

    var service = serviceRepo.GetById(id);
    if (service == null) return Results.NotFound();
    if (service.SpecialistId != specialist.Id) return Results.Json(new { message = "You can only delete your own services." }, statusCode: 403);

    var deleted = serviceRepo.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Clients endpoints - Admin only
var clients = app.MapGroup("/api/clients").WithTags("Clients");

clients.MapGet("/", (HttpContext context, IClientRepository repository, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var results = repository.GetAll();
    return Results.Ok(results);
});

clients.MapGet("/{id:guid}", (Guid id, HttpContext context, IClientRepository repository, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var client = repository.GetById(id);
    return client is null ? Results.NotFound() : Results.Ok(client);
});

clients.MapPost("/", (CreateClientRequest request, HttpContext context, IClientRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Client name is required." });
    
    if (string.IsNullOrWhiteSpace(request.Email))
        return Results.BadRequest(new { message = "Email is required." });

    if (repository.GetByEmail(request.Email) != null)
        return Results.BadRequest(new { message = "A client with this email already exists." });

    var client = repository.Add(request.Name, request.Email, request.Phone, request.Notes);
    return Results.Created($"/api/clients/{client.Id}", client);
});

clients.MapPut("/{id:guid}", (Guid id, UpdateClientRequest request, HttpContext context, IClientRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { message = "Client name is required." });

    var updated = repository.Update(id, request.Name, request.Email, request.Phone, request.Notes);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

clients.MapDelete("/{id:guid}", (Guid id, HttpContext context, IClientRepository repository,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var deleted = repository.Delete(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

// Client pricing endpoints
clients.MapGet("/{clientId:guid}/prices", (Guid clientId, HttpContext context, IClientServicePriceRepository priceRepo,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var prices = priceRepo.GetAllPricesForClient(clientId);
    return Results.Ok(prices);
});

clients.MapPost("/{clientId:guid}/prices", (Guid clientId, SetClientServicePriceRequest request, HttpContext context,
    IClientServicePriceRepository priceRepo, IClientRepository clientRepo, IServiceRepository serviceRepo,
    IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    // Validate client and service exist
    var client = clientRepo.GetById(clientId);
    if (client == null) return Results.BadRequest(new { message = "Client not found." });

    var service = serviceRepo.GetById(request.ServiceId);
    if (service == null) return Results.BadRequest(new { message = "Service not found." });

    var price = priceRepo.SetPrice(clientId, request.ServiceId, request.CustomPrice);
    return Results.Ok(price);
});

clients.MapDelete("/{clientId:guid}/prices/{serviceId:guid}", (Guid clientId, Guid serviceId, HttpContext context,
    IClientServicePriceRepository priceRepo, IUserRepository userRepo, IAuthService authService) =>
{
    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault() ?? "";
    var token = authHeader.Replace("Bearer ", "");
    var userId = authService.ValidateToken(token);
    
    if (userId == null) return Results.Unauthorized();

    var user = userRepo.GetById(userId.Value);
    if (user == null || !user.IsAdmin) return Results.Forbid();

    var deleted = priceRepo.DeletePrice(clientId, serviceId);
    return deleted ? Results.NoContent() : Results.NotFound();
});

static void SeedInitialData(GlowBookDbContext context)
{
    if (context.Specialists.Any()) return; // Already seeded

    // Seed Specialists
    var specialists = new[]
    {
        new Specialist
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Sarah Johnson",
            Category = "Hair",
            Description = "Expert hair stylist with 10+ years experience",
            PricePerHour = 60,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Emily Chen",
            Category = "Nails",
            Description = "Certified nail technician specializing in nail art",
            PricePerHour = 45,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Name = "Maria Garcia",
            Category = "Makeup",
            Description = "Professional makeup artist for all occasions",
            PricePerHour = 80,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Name = "Jessica Lee",
            Category = "Hair",
            Description = "Specializing in color and balayage",
            PricePerHour = 70,
            Rating = 4,
            CreatedAt = DateTime.UtcNow
        },
        new Specialist
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            Name = "Amanda White",
            Category = "Nails",
            Description = "Gel extensions and manicure expert",
            PricePerHour = 50,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        }
    };

    context.Specialists.AddRange(specialists);

    // Seed Services
    var services = new[]
    {
        // Hair Services
        new Service
        {
            Id = Guid.Parse("a1111111-1111-1111-1111-111111111111"),
            Name = "Women's Haircut",
            Category = "Hair",
            DurationMinutes = 45,
            Price = 50,
            Description = "Professional haircut and styling",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("a2222222-2222-2222-2222-222222222222"),
            Name = "Men's Haircut",
            Category = "Hair",
            DurationMinutes = 30,
            Price = 35,
            Description = "Classic men's haircut",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("a3333333-3333-3333-3333-333333333333"),
            Name = "Hair Coloring",
            Category = "Hair",
            DurationMinutes = 120,
            Price = 120,
            Description = "Full hair coloring service",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("a4444444-4444-4444-4444-444444444444"),
            Name = "Balayage",
            Category = "Hair",
            DurationMinutes = 180,
            Price = 180,
            Description = "Balayage highlights",
            CreatedAt = DateTime.UtcNow
        },
        // Nail Services
        new Service
        {
            Id = Guid.Parse("b1111111-1111-1111-1111-111111111111"),
            Name = "Classic Manicure",
            Category = "Nails",
            DurationMinutes = 30,
            Price = 25,
            Description = "Traditional manicure",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("b2222222-2222-2222-2222-222222222222"),
            Name = "Gel Manicure",
            Category = "Nails",
            DurationMinutes = 45,
            Price = 40,
            Description = "Long-lasting gel manicure",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("b3333333-3333-3333-3333-333333333333"),
            Name = "Pedicure",
            Category = "Nails",
            DurationMinutes = 60,
            Price = 45,
            Description = "Relaxing pedicure service",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("b4444444-4444-4444-4444-444444444444"),
            Name = "Nail Art",
            Category = "Nails",
            DurationMinutes = 90,
            Price = 65,
            Description = "Custom nail art design",
            CreatedAt = DateTime.UtcNow
        },
        // Makeup Services
        new Service
        {
            Id = Guid.Parse("c1111111-1111-1111-1111-111111111111"),
            Name = "Everyday Makeup",
            Category = "Makeup",
            DurationMinutes = 45,
            Price = 60,
            Description = "Natural everyday look",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("c2222222-2222-2222-2222-222222222222"),
            Name = "Special Event Makeup",
            Category = "Makeup",
            DurationMinutes = 90,
            Price = 100,
            Description = "Glamorous makeup for special occasions",
            CreatedAt = DateTime.UtcNow
        },
        new Service
        {
            Id = Guid.Parse("c3333333-3333-3333-3333-333333333333"),
            Name = "Bridal Makeup",
            Category = "Makeup",
            DurationMinutes = 120,
            Price = 150,
            Description = "Complete bridal makeup package",
            CreatedAt = DateTime.UtcNow
        }
    };

    context.Services.AddRange(services);
    context.SaveChanges();
}

app.Run();
