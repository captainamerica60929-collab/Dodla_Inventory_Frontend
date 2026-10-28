import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiCredentialPageComponent } from './api-credential.page';
import { ApiCredentialService } from '../../../core/api/api-credential.service';
import { MetadataService } from '../../../core/api/metadata.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('ApiCredentialPageComponent', () => {
  let component: ApiCredentialPageComponent;
  let fixture: ComponentFixture<ApiCredentialPageComponent>;
  let credService: ApiCredentialService;
  let metaService: MetadataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiCredentialPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiCredentialService,
        MetadataService,
        NotificationService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApiCredentialPageComponent);
    component = fixture.componentInstance;
    credService = TestBed.inject(ApiCredentialService);
    metaService = TestBed.inject(MetadataService);
  });

  it('should create component and validate extraHeadersJson format', () => {
    expect(component).toBeTruthy();

    const control = component.form.controls.extraHeadersJson;
    control.setValue('not a valid json');
    expect(control.errors?.['invalidJson']).toBe(true);

    control.setValue('{"Accept": "application/json"}');
    expect(control.errors).toBeNull();
  });

  it('should handle write-only secret omitting it from update unless replaced', () => {
    const updateSpy = vi.spyOn(credService, 'update').mockReturnValue(
      of({
        id: 1,
        branchId: 1,
        name: 'Cred 1',
        baseUrl: 'https://api.test',
        httpMethod: 'GET',
        authType: 'ApiKey',
        userName: null,
        headerName: 'X-Key',
        hasSecret: true,
        extraHeadersJson: null,
        timeoutSeconds: 30,
        contentType: 'application/json',
        requestBodyTemplate: null,
        responseRootPath: null,
        isActive: true,
        createdAt: '',
        createdBy: null,
        modifiedAt: null,
        modifiedBy: null,
      }),
    );

    component.selectedId.set(1);
    component.isNew.set(false);
    component.hasSavedSecret.set(true);
    component.isReplacingSecret.set(false);

    component.form.patchValue({
      name: 'Cred 1',
      baseUrl: 'https://api.test',
      httpMethod: 'GET',
      authType: 'ApiKey',
      headerName: 'X-Key',
      secret: 'should-not-be-sent-without-replace',
    });

    component.saveCredential();

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        secret: undefined,
      }),
    );

    // Now test with isReplacingSecret = true
    component.isReplacingSecret.set(true);
    component.form.controls.secret.setValue('new-secret-123');
    component.saveCredential();

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        secret: 'new-secret-123',
      }),
    );
  });

  it('should detect duplicate target columns and enforce required GrnNo in mapping editor', () => {
    component.mappingRows.set([
      { sourceField: 'FIELD1', targetColumn: 'GrnNo', isRequired: true },
      { sourceField: 'FIELD2', targetColumn: 'Plant', isRequired: false },
    ]);

    expect(component.mappingErrors().length).toBe(0);

    // Duplicate target column
    component.mappingRows.set([
      { sourceField: 'FIELD1', targetColumn: 'Plant', isRequired: false },
      { sourceField: 'FIELD2', targetColumn: 'Plant', isRequired: false },
    ]);

    const errors = component.mappingErrors();
    expect(errors.some((e) => e.includes('Duplicate Target Column'))).toBe(true);
    expect(errors.some((e) => e.includes('GrnNo'))).toBe(true);
  });

  it('should display error state and allow retry when target-columns metadata fails', () => {
    vi.spyOn(metaService, 'getTargetColumns').mockReturnValue(
      throwError(() => ({ error: { detail: 'Network down' } })),
    );

    component.loadTargetColumns();
    expect(component.targetColumnsError()).toBe('Network down');
    expect(component.targetColumns().length).toBe(0);
  });

  it('should send exact UpsertApiFieldMappingDto payload shape with integer targetColumn and nulls', () => {
    const replaceSpy = vi.spyOn(credService, 'replaceMappings').mockReturnValue(of([]));

    component.selectedId.set(42);
    component.targetColumns.set(['GrnNo', 'GrnYear', 'GrnItemNo', 'GrnDate', 'InvoiceNo', 'InvoiceDate', 'Qty', 'Uom', 'MaterialCode', 'PartName', 'Description', 'Plant']);
    component.mappingRows.set([
      {
        sourceField: '  SAP_GRN  ',
        targetColumn: 'GrnNo',
        format: '   ',
        defaultValue: '',
        isRequired: true,
      },
      {
        sourceField: 'WERKS',
        targetColumn: 'Plant',
        format: null,
        defaultValue: '1000',
        isRequired: false,
      },
    ]);

    component.saveMappings();

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith(42, [
      {
        sourceField: 'SAP_GRN',
        targetColumn: 0, // TargetColumn.GrnNo = 0
        format: null,
        defaultValue: null,
        isRequired: true,
      },
      {
        sourceField: 'WERKS',
        targetColumn: 11, // TargetColumn.Plant = 11
        format: null,
        defaultValue: '1000',
        isRequired: false,
      },
    ]);
  });

  it('should send integer enum value for authType when creating or updating credential', () => {
    const createSpy = vi.spyOn(credService, 'create').mockReturnValue(
      of({ id: 99, name: 'New Cred' } as any),
    );

    component.openCreateForm();
    component.form.patchValue({
      name: 'New SAP Cred',
      baseUrl: 'https://sap.corp/api',
      httpMethod: 'POST',
      authType: 'ApiKey',
      headerName: 'X-Key',
      secret: 'my-secret',
    });

    component.saveCredential();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New SAP Cred',
        baseUrl: 'https://sap.corp/api',
        httpMethod: 'POST',
        authType: 1, // AuthType.ApiKey = 1
      }),
    );
  });
});
