---
name: dotnet-clean-architecture
description: Use for any backend work in the .NET 8 WareTrack API - adding entities, use cases (commands/queries), validators, repositories, EF Core configuration, migrations, controllers/endpoints, auth policies, error handling, and backend tests.
---

# .NET 8 Clean Architecture rules

FIRST inspect the solution (projects, folder names, whether MediatR/FluentValidation/EF Core are used) and
follow what exists. Do not introduce a new pattern without asking.

## Layer responsibilities
- Domain: entities with behaviour, value objects, domain services, domain exceptions. No EF, no HTTP, no packages.
- Application: use cases (one class per command/query), DTOs, validators, interfaces (IRepository, ISapGrnClient,
  IClock, ICurrentUser, IUnitOfWork). Depends on Domain only.
- Infrastructure: EF Core DbContext + configurations + migrations, repositories, SAP client, JWT/identity.
- Api: thin controllers or minimal-API endpoints, auth policies, ProblemDetails, Swagger. No business logic.
Dependencies point inward only.

## Conventions
- Rich domain: e.g. `GrnLine.MapQuantity(qty)`, `FifoPolicy.EnsureOldestFirst(...)`; entities protect invariants.
- Domain rule violation -> DomainException with a code -> HTTP 422 (state conflict: 409) as ProblemDetails.
- Shape validation (required, ranges) in Application validators; business rules in Domain.
- Each stock-changing use case runs in ONE transaction and writes a StockMovement. Add a rowversion/concurrency
  token on StockRecord and bins.
- Inject IClock (never DateTime.UtcNow in domain code) and ICurrentUser (write UserId on movements).
- Async everywhere with CancellationToken. Return DTOs, never entities.
- Authorization: policies per role from the matrix in wms-domain-rules (e.g. policy "CanGiveOut").
- Folders: Features/<Area>/<UseCase>/ (e.g. Features/Stock/GiveOut/GiveOutCommand.cs) unless the repo differs.
- API shape: REST, plural nouns: GET /api/materials, POST /api/grn/fetch, POST /api/grn/{id}/print,
  POST /api/inward, POST /api/outward, POST /api/transfers, POST /api/movements/{id}/void, GET /api/reports/{name}.
- Pagination + filtering on list endpoints. Swagger annotated. CORS only for the Angular dev origin.

## Tests
- Domain: unit test every invariant (FIFO violation, over capacity, void blocked...).
- Application: handler tests with fakes.
- Integration: WebApplicationFactory + test database for GRN -> map -> give out.

## Definition of done
Build and tests pass, migration generated and reviewed (no data-loss ops), Swagger shows the endpoint,
and the DTO contract for Angular is stated in the reply.
