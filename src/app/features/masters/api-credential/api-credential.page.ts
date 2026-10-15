import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import {
  ApiCredentialDto,
  ApiCredentialService,
  ApiFieldMappingDto,
  ApiTestResultDto,
  AuthType,
  CreateApiCredentialDto,
  GrnApiResponsePreviewDto,
  MappingPreviewResultDto,
  SamplePreviewResultDto,
  UpdateApiCredentialDto,
  UpsertApiFieldMappingDto,
} from '../../../core/api/api-credential.service';
import { MetadataService } from '../../../core/api/metadata.service';
import { NotificationService } from '../../../core/services/notification.service';

const DEV_SAMPLE_JSON = JSON.stringify(
  {
    status: 'OK',
    data: {
      items: [
        {
          GRNNo: '5000123456',
          'GRN Date': '2026-10-15 12:11 PM',
          PartName: 'Motor Assembly',
          InvoiceNo: 'INV-2026-001',
          Description: 'Motor Assembly - Goods Receipt',
          Qty: 100,
          Plant: '1000',
        },
        {
          GRNNo: '5000123457',
          'GRN Date': '2026-10-15 03:40 PM',
          PartName: 'Gear Box',
          InvoiceNo: 'INV-2026-002',
          Description: 'Gear Box - Goods Receipt',
          Qty: 40,
          Plant: '2000',
        },
      ],
    },
  },
  null,
  2,
);

export const AUTH_TO_INT: Record<string, number> = {
  None: 0,
  ApiKey: 1,
  Basic: 2,
  Bearer: 3,
};

export const INT_TO_AUTH: Record<number, string> = {
  0: 'None',
  1: 'ApiKey',
  2: 'Basic',
  3: 'Bearer',
};

export const STATIC_TARGET_COLUMNS = [
  'GrnNo',
  'GrnYear',
  'GrnItemNo',
  'GrnDate',
  'InvoiceNo',
  'InvoiceDate',
  'Qty',
  'Uom',
  'MaterialCode',
  'PartName',
  'Description',
  'Plant',
  'StorageLocation',
  'BatchNo',
  'PoNo',
  'PoItem',
  'VendorCode',
  'VendorName',
] as const;

export function toTargetColumnIndex(col: string | number, availableCols?: string[]): number {
  if (typeof col === 'number') return col;
  const list = availableCols && availableCols.length > 0 ? availableCols : (STATIC_TARGET_COLUMNS as readonly string[]);
  const idx = (list as readonly string[]).indexOf(String(col));
  return idx >= 0 ? idx : 0;
}

export function toTargetColumnName(col: string | number, availableCols?: string[]): string {
  if (typeof col === 'string') return col;
  const list = availableCols && availableCols.length > 0 ? availableCols : (STATIC_TARGET_COLUMNS as readonly string[]);
  return list[col] ?? String(col);
}

// JSON validator
function jsonValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value || !control.value.trim()) return null;
  try {
    JSON.parse(control.value);
    return null;
  } catch {
    return { invalidJson: true };
  }
}

@Component({
  selector: 'app-api-credential-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cred-container">
      <!-- Top header / actions -->
      <div class="panel" style="--acc: var(--blue);">
        <div class="ph">
          <div>
            <h3>SAP API Credentials</h3>
            <div class="sub">
              Manage endpoints, authentication, field mappings, and test connectivity
            </div>
          </div>
          <button type="button" class="btn a s" (click)="openCreateForm()">
            + New Credential
          </button>
        </div>

        @if (isLoadingList()) {
          <div class="pb text-center faint">Loading credentials...</div>
        } @else {
          <app-data-table
            [headers]="['Name', 'Base URL', 'Method', 'Auth Type', 'Status', 'Actions']"
            [isEmpty]="credentials().length === 0"
            emptyText="No credentials defined."
          >
            @for (cred of credentials(); track cred.id) {
              <tr
                tabindex="0"
                [class.selected-row]="selectedId() === cred.id"
                (click)="selectCredential(cred.id)"
                (keydown.enter)="selectCredential(cred.id)"
              >
                <td>
                  <b>{{ cred.name }}</b>
                  @if (isDevMode && cred.name.includes('Mock GRN API (dev)')) {
                    <span class="dev-tag">Dev</span>
                  }
                </td>
                <td class="mono truncate-url" [title]="cred.baseUrl">{{ cred.baseUrl }}</td>
                <td class="mono">
                  <span class="method-badge">{{ cred.httpMethod }}</span>
                </td>
                <td>{{ formatAuthType(cred.authType) }}</td>
                <td>
                  <app-pill
                    [variant]="cred.isActive ? 'green' : 'default'"
                    [text]="cred.isActive ? 'Active' : 'Inactive'"
                  />
                </td>
                <td class="actions-col">
                  <button
                    type="button"
                    class="btn s ghost"
                    (click)="selectCredential(cred.id); $event.stopPropagation()"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            }
          </app-data-table>

          @if (isDevMode && credentials().length === 0) {
            <div class="dev-hint-banner">
              💡 Start the API in Development to auto-create the Mock GRN API (dev) credential.
            </div>
          }
        }
      </div>

      <!-- Credential Details & Subsections (when selected or creating) -->
      @if (isEditing()) {
        <div class="edit-section" data-tour="cred-form">
          <div class="panel" style="--acc: var(--amber);">
            <div class="ph">
              <div>
                <h3>{{ isNew() ? 'Create API Credential' : 'Edit Credential: ' + form.value.name }}</h3>
                <div class="sub">Connection parameters, authentication, and HTTP settings</div>
              </div>
              <div class="header-btns">
                @if (!isNew() && selectedId()) {
                  <button
                    type="button"
                    class="btn a s"
                    data-tour="cred-test-btn"
                    [disabled]="isTesting()"
                    (click)="runTestConnection()"
                  >
                    {{ isTesting() ? 'Testing...' : 'Test Connection' }}
                  </button>
                }
                <button type="button" class="btn s" (click)="cancelEdit()">Close</button>
              </div>
            </div>

            <form [formGroup]="form" (ngSubmit)="saveCredential()" class="pb form-grid">
              <div class="field">
                <label for="cred-name">Credential Name *</label>
                <input id="cred-name" type="text" formControlName="name" placeholder="e.g. S4HANA GRN API" />
                @if (form.controls.name.touched && form.controls.name.errors?.['required']) {
                  <span class="err">Name is required.</span>
                }
              </div>

              <div class="field">
                <label for="cred-url">Base URL *</label>
                <input
                  id="cred-url"
                  type="url"
                  class="mono"
                  formControlName="baseUrl"
                  placeholder="https://sap-gateway.corp/sap/opu/odata/..."
                />
                @if (form.controls.baseUrl.touched && form.controls.baseUrl.errors?.['required']) {
                  <span class="err">Base URL is required.</span>
                }
              </div>

              <div class="field-row">
                <div class="field flex-1">
                  <label for="cred-method">HTTP Method *</label>
                  <select id="cred-method" formControlName="httpMethod">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div class="field flex-1">
                  <label for="cred-auth">Authentication Type *</label>
                  <select id="cred-auth" formControlName="authType" (change)="onAuthTypeChange()">
                    <option value="None">None</option>
                    <option value="ApiKey">ApiKey</option>
                    <option value="Basic">Basic</option>
                    <option value="Bearer">Bearer</option>
                  </select>
                </div>

                <div class="field flex-1">
                  <label for="cred-timeout">Timeout (Seconds)</label>
                  <input id="cred-timeout" type="number" formControlName="timeoutSeconds" min="1" max="300" />
                </div>
              </div>

              <!-- Conditional Auth Fields -->
              @if (currentAuthType === 'ApiKey') {
                <div class="field-row">
                  <div class="field flex-1">
                    <label for="cred-header">Header Name *</label>
                    <input id="cred-header" type="text" class="mono" formControlName="headerName" placeholder="X-Api-Key" />
                  </div>
                  <div class="field flex-1" data-tour="cred-secret">
                    <label for="cred-secret">Secret / API Key *</label>
                    @if (hasSavedSecret() && !isReplacingSecret()) {
                      <div class="secret-saved-box">
                        <span class="badge-saved">🔒 Secret saved</span>
                        <button type="button" class="btn s" (click)="isReplacingSecret.set(true)">Replace</button>
                      </div>
                    } @else {
                      <div class="secret-input-wrapper">
                        <input
                          id="cred-secret"
                          type="password"
                          autocomplete="off"
                          formControlName="secret"
                          placeholder="Enter secret..."
                        />
                        @if (isReplacingSecret()) {
                          <button type="button" class="btn s" (click)="isReplacingSecret.set(false)">Cancel</button>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              @if (currentAuthType === 'Basic') {
                <div class="field-row">
                  <div class="field flex-1">
                    <label for="cred-user">Username *</label>
                    <input id="cred-user" type="text" formControlName="userName" placeholder="Username" />
                  </div>
                  <div class="field flex-1" data-tour="cred-secret">
                    <label for="cred-secret">Password *</label>
                    @if (hasSavedSecret() && !isReplacingSecret()) {
                      <div class="secret-saved-box">
                        <span class="badge-saved">🔒 Secret saved</span>
                        <button type="button" class="btn s" (click)="isReplacingSecret.set(true)">Replace</button>
                      </div>
                    } @else {
                      <div class="secret-input-wrapper">
                        <input
                          id="cred-secret"
                          type="password"
                          autocomplete="off"
                          formControlName="secret"
                          placeholder="Enter password..."
                        />
                        @if (isReplacingSecret()) {
                          <button type="button" class="btn s" (click)="isReplacingSecret.set(false)">Cancel</button>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              @if (currentAuthType === 'Bearer') {
                <div class="field" data-tour="cred-secret">
                  <label for="cred-secret">Bearer Token *</label>
                  @if (hasSavedSecret() && !isReplacingSecret()) {
                    <div class="secret-saved-box">
                      <span class="badge-saved">🔒 Secret saved</span>
                      <button type="button" class="btn s" (click)="isReplacingSecret.set(true)">Replace</button>
                    </div>
                  } @else {
                    <div class="secret-input-wrapper">
                      <input
                        id="cred-secret"
                        type="password"
                        autocomplete="off"
                        formControlName="secret"
                        placeholder="ey..."
                      />
                      @if (isReplacingSecret()) {
                        <button type="button" class="btn s" (click)="isReplacingSecret.set(false)">Cancel</button>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Payload / Advanced headers -->
              <div class="field">
                <label for="cred-root">Response Root Path (optional)</label>
                <input
                  id="cred-root"
                  type="text"
                  class="mono"
                  formControlName="responseRootPath"
                  placeholder="e.g. data.items or d.results"
                />
              </div>

              <div class="field">
                <label for="cred-extra">Extra Headers JSON (optional)</label>
                <textarea
                  id="cred-extra"
                  rows="3"
                  class="mono"
                  formControlName="extraHeadersJson"
                  placeholder='{ "Accept": "application/json" }'
                ></textarea>
                @if (form.controls.extraHeadersJson.errors?.['invalidJson']) {
                  <span class="err">Must be a valid JSON object.</span>
                }
              </div>

              <div class="field">
                <label for="cred-body">Request Body Template (optional)</label>
                <textarea
                  id="cred-body"
                  rows="3"
                  class="mono"
                  formControlName="requestBodyTemplate"
                  placeholder='{ "plant": "{plant}", "fromDate": "{fromDate}" }'
                ></textarea>
              </div>

              <div class="field-checkbox">
                <label>
                  <input type="checkbox" formControlName="isActive" />
                  <span>Credential Active</span>
                </label>
              </div>

              <div class="form-actions">
                <button type="button" class="btn" (click)="cancelEdit()">Cancel</button>
                <button type="submit" class="btn a" [disabled]="form.invalid || isSaving()">
                  {{ isSaving() ? 'Saving...' : (isNew() ? 'Create Credential' : 'Save Changes') }}
                </button>
              </div>
            </form>
          </div>

          <!-- Test Result Box -->
          @if (testResult(); as res) {
            <div class="panel test-result-panel" [style.--acc]="res.success ? 'var(--green)' : 'var(--red)'">
              <div class="ph">
                <div class="test-title-row">
                  <app-pill [variant]="res.success ? 'Accepted' : 'Error'" [text]="res.success ? 'Success' : 'Failed'" />
                  <b>Status {{ res.statusCode }} ({{ res.reasonPhrase }})</b>
                  <span class="elapsed mono">{{ res.elapsedMs }} ms</span>
                </div>
                @if (res.bodyPreview) {
                  <button type="button" class="btn s" (click)="copyText(res.bodyPreview)">Copy Preview</button>
                }
              </div>
              <div class="pb">
                <pre class="preview-box mono">{{ res.bodyPreview || '(No response body returned)' }}</pre>
              </div>
            </div>
          }

          <!-- Field Mapping Section -->
          @if (!isNew() && selectedId()) {
            <div class="panel" style="--acc: var(--teal);" data-tour="cred-mapping">
              <div class="ph">
                <div>
                  <h3>Field Mappings</h3>
                  <div class="sub">Map incoming JSON payload properties to domain Target Columns</div>
                </div>
                <div class="header-btns">
                  <button type="button" class="btn s" (click)="addMappingRow()">+ Add Row</button>
                  <button
                    type="button"
                    class="btn a s"
                    [disabled]="isSavingMappings() || mappingErrors().length > 0"
                    (click)="saveMappings()"
                  >
                    {{ isSavingMappings() ? 'Saving...' : 'Save Mappings' }}
                  </button>
                </div>
              </div>

              <div class="pb">
                <!-- Metadata Target Columns Error / Retry -->
                @if (targetColumnsError()) {
                  <div class="meta-error-alert">
                    <span>⚠️ Failed to load target columns: {{ targetColumnsError() }}</span>
                    <button type="button" class="btn s" (click)="loadTargetColumns()">Retry</button>
                  </div>
                }

                @if (mappingErrors().length > 0) {
                  <div class="mapping-validation-errors">
                    @for (err of mappingErrors(); track err) {
                      <div>• {{ err }}</div>
                    }
                  </div>
                }

                <div class="tw">
                  <table class="mapping-table">
                    <thead>
                      <tr>
                        <th>Source Field (in JSON) *</th>
                        <th>Target Column *</th>
                        <th>Format (Optional)</th>
                        <th>Default Value (Optional)</th>
                        <th>Required</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of mappingRows(); track $index) {
                        <tr class="mapping-row">
                          <td data-label="Source Field (in JSON) *">
                            <input
                              type="text"
                              class="mono"
                              [value]="row.sourceField"
                              placeholder="e.g. GRNNo"
                              (input)="updateRowField($index, 'sourceField', $any($event.target).value)"
                            />
                          </td>
                          <td data-label="Target Column *">
                            <select
                              [value]="row.targetColumn"
                              (change)="updateRowField($index, 'targetColumn', $any($event.target).value)"
                            >
                              <option value="">Select target column...</option>
                              @for (col of targetColumns(); track col) {
                                <option [value]="col">{{ col }}</option>
                              }
                            </select>
                          </td>
                          <td data-label="Format (Optional)">
                            <input
                              type="text"
                              class="mono"
                              [value]="row.format || ''"
                              placeholder="e.g. yyyy-MM-dd"
                              (input)="updateRowField($index, 'format', $any($event.target).value)"
                            />
                          </td>
                          <td data-label="Default Value (Optional)">
                            <input
                              type="text"
                              [value]="row.defaultValue || ''"
                              placeholder="Default fallback"
                              (input)="updateRowField($index, 'defaultValue', $any($event.target).value)"
                            />
                          </td>
                          <td data-label="Required" class="checkbox-cell">
                            <label class="mobile-cb-lbl">
                              <input
                                type="checkbox"
                                [checked]="row.isRequired"
                                [disabled]="row.targetColumn === 'GrnNo'"
                                (change)="updateRowField($index, 'isRequired', $any($event.target).checked)"
                              />
                              <span class="mobile-cb-text">Required</span>
                            </label>
                          </td>
                          <td data-label="Action" class="action-cell">
                            <button
                              type="button"
                              class="btn s ghost text-danger"
                              (click)="removeMappingRow($index)"
                              title="Delete Row"
                            >
                              ✕ Delete
                            </button>
                          </td>
                        </tr>
                      }
                      @if (mappingRows().length === 0) {
                        <tr>
                          <td colspan="6" class="text-center faint pb">
                            No mappings configured. Click "+ Add Row" to begin.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Preview Mapping Section -->
            <div class="panel" style="--acc: var(--purple);" data-tour="cred-preview">
              <div class="ph">
                <div>
                  <h3>Preview Mapping</h3>
                  <div class="sub">Verify transformation rules against sample or live API data</div>
                </div>
                <div class="header-btns">
                  <div class="tabs">
                    <button
                      type="button"
                      class="btn s"
                      [class.p]="previewMode() === 'sample'"
                      (click)="previewMode.set('sample')"
                    >
                      Paste Sample JSON
                    </button>
                    <button
                      type="button"
                      class="btn s"
                      [class.p]="previewMode() === 'live'"
                      (click)="previewMode.set('live')"
                    >
                      Live API
                    </button>
                  </div>
                </div>
              </div>

              <div class="pb">
                @if (previewMode() === 'sample') {
                  <div class="sample-box">
                    <div class="sample-top">
                      <label for="sample-json">Sample Response JSON</label>
                      @if (isDevMode) {
                        <button type="button" class="btn s a" (click)="loadDevSample()">
                          Load sample
                        </button>
                      }
                    </div>
                    <textarea
                      id="sample-json"
                      rows="6"
                      class="mono"
                      [value]="sampleJsonInput()"
                      placeholder='{&#10;  "status": "OK",&#10;  "data": {&#10;    "items": [&#10;      { "GRNNo": "5000101", "Qty": 200 }&#10;    ]&#10;  }&#10;}'
                      (input)="sampleJsonInput.set($any($event.target).value)"
                    ></textarea>

                    <div class="sample-action-row">
                      <div class="field" style="max-width: 280px;">
                        <label for="sample-root">Response Root Path</label>
                        <input
                          id="sample-root"
                          type="text"
                          class="mono"
                          [value]="sampleRootPath()"
                          placeholder="e.g. data.items"
                          (input)="sampleRootPath.set($any($event.target).value)"
                        />
                      </div>
                      <button
                        type="button"
                        class="btn a"
                        [disabled]="isPreviewingSample()"
                        (click)="runSamplePreview()"
                      >
                        {{ isPreviewingSample() ? 'Transforming...' : 'Preview Sample' }}
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="live-preview-box">
                    <p class="faint">
                      Queries the live endpoint configured above and applies the saved field mappings.
                    </p>
                    <button
                      type="button"
                      class="btn a"
                      [disabled]="isPreviewingLive()"
                      (click)="runLivePreview()"
                    >
                      {{ isPreviewingLive() ? 'Running Live Preview...' : 'Run Live Preview' }}
                    </button>
                  </div>
                }

                <!-- Preview Table -->
                @if (previewRows().length > 0) {
                  <div class="preview-results-header">
                    <b>Mapped Preview Results ({{ previewRows().length }} rows)</b>
                    @if (previewErrorCount() > 0) {
                      <app-pill variant="red" [text]="previewErrorCount() + ' Errors'" />
                    } @else {
                      <app-pill variant="green" text="All Rows Valid" />
                    }
                  </div>

                  <div class="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>GRN No</th>
                          <th>Material Code</th>
                          <th>Part Name</th>
                          <th>Qty</th>
                          <th>Plant</th>
                          <th>Batch</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (pRow of previewRows(); track $index) {
                          <tr [class.highlight-err]="pRow.errorMessage">
                            <td>
                              <app-pill
                                [variant]="pRow.errorMessage ? 'Error' : 'Processed'"
                                [text]="pRow.errorMessage ? 'Error' : 'Processed'"
                              />
                            </td>
                            <td class="mono">{{ pRow.grnNo || '—' }}</td>
                            <td class="mono">{{ pRow.materialCode || '—' }}</td>
                            <td>{{ pRow.partName || '—' }}</td>
                            <td class="mono">{{ pRow.qty ?? '—' }}</td>
                            <td class="mono">{{ pRow.plant || '—' }}</td>
                            <td class="mono">{{ pRow.batchNo || '—' }}</td>
                            <td class="err-cell">{{ pRow.errorMessage || '—' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .cred-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dev-tag {
      font-size: 10px;
      font-weight: 700;
      background: var(--amberBg);
      color: var(--amberD);
      padding: 1px 6px;
      border-radius: 12px;
      margin-left: 6px;
      text-transform: uppercase;
    }

    .dev-hint-banner {
      padding: 12px 18px;
      background: var(--hov);
      border-top: 1px dashed var(--line);
      font-size: 12.5px;
      color: var(--dim);
    }

    .truncate-url {
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .method-badge {
      font-weight: 700;
      font-size: 11px;
      color: var(--amberD);
    }

    .selected-row {
      background: color-mix(in srgb, var(--amber) 12%, var(--card)) !important;
    }

    .actions-col {
      width: 90px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--dim);
      }

      input, select, textarea {
        width: 100%;
      }

      .err {
        font-size: 11px;
        color: var(--red);
      }
    }

    .field-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .flex-1 {
      flex: 1;
      min-width: 160px;
    }

    .secret-saved-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);

      .badge-saved {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--green);
      }
    }

    .secret-input-wrapper {
      display: flex;
      gap: 8px;
    }

    .field-checkbox {
      label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        cursor: pointer;

        input {
          accent-color: var(--amber);
        }
      }
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 10px;
      border-top: 1px solid var(--line);
    }

    .header-btns {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .test-result-panel {
      .test-title-row {
        display: flex;
        align-items: center;
        gap: 10px;

        .elapsed {
          color: var(--faint);
          font-size: 11.5px;
        }
      }

      .preview-box {
        padding: 12px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        font-size: 11.8px;
        max-height: 220px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }

    .meta-error-alert {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: var(--redBg);
      color: var(--red);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 12.5px;
    }

    .mapping-validation-errors {
      padding: 8px 12px;
      border-radius: var(--radius-md);
      background: var(--redBg);
      color: var(--red);
      font-size: 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sample-box {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .sample-top {
        display: flex;
        justify-content: space-between;
        align-items: center;

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--dim);
        }
      }

      .sample-action-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }
    }

    .live-preview-box {
      padding: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .preview-results-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0 10px;
    }

    .highlight-err {
      background: var(--redBg);
    }

    .mapping-table {
      width: 100%;
      border-collapse: collapse;

      th {
        text-align: left;
        padding: 9px 12px;
        background: color-mix(in srgb, var(--amber) 10%, var(--bg));
        color: var(--dim);
        font-weight: 600;
        font-size: 11px;
        border-bottom: 1px solid var(--line);
      }

      td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--line);
      }

      .mobile-cb-text {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .mapping-table {
        thead {
          display: none;
        }

        tbody tr.mapping-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          margin-bottom: 12px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
        }

        tbody td {
          display: flex;
          flex-direction: column;
          padding: 0;
          border: none;

          &::before {
            content: attr(data-label);
            font-size: 11px;
            font-weight: 600;
            color: var(--dim);
            margin-bottom: 4px;
          }

          &.checkbox-cell {
            flex-direction: row;
            align-items: center;

            &::before {
              display: none;
            }

            .mobile-cb-lbl {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .mobile-cb-text {
              display: inline;
              font-size: 12.5px;
              color: var(--text);
            }
          }

          &.action-cell {
            &::before {
              display: none;
            }
            .btn {
              width: 100%;
              justify-content: center;
            }
          }
        }
      }

      .form-grid {
        gap: 10px;
      }

      .field-row {
        flex-direction: column;
        gap: 10px;
      }

      .header-btns {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;

        .btn {
          flex: 1;
        }
      }

      .sample-action-row {
        flex-direction: column;
        align-items: stretch !important;

        .field {
          max-width: none !important;
        }
      }
    }
  `],
})
export class ApiCredentialPageComponent implements OnInit {
  private readonly credService = inject(ApiCredentialService);
  private readonly metaService = inject(MetadataService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly isDevMode = !environment.production;

  // List signals
  readonly credentials = signal<ApiCredentialDto[]>([]);
  readonly isLoadingList = signal<boolean>(false);
  readonly selectedId = signal<number | null>(null);

  // Form signals
  readonly isEditing = signal<boolean>(false);
  readonly isNew = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isTesting = signal<boolean>(false);
  readonly hasSavedSecret = signal<boolean>(false);
  readonly isReplacingSecret = signal<boolean>(false);

  // Test result
  readonly testResult = signal<ApiTestResultDto | null>(null);

  // Mapping state
  readonly targetColumns = signal<string[]>([]);
  readonly targetColumnsError = signal<string | null>(null);
  readonly mappingRows = signal<UpsertApiFieldMappingDto[]>([]);
  readonly isSavingMappings = signal<boolean>(false);

  // Preview state
  readonly previewMode = signal<'sample' | 'live'>('sample');
  readonly sampleJsonInput = signal<string>('');
  readonly sampleRootPath = signal<string>('');
  readonly isPreviewingSample = signal<boolean>(false);
  readonly isPreviewingLive = signal<boolean>(false);
  readonly previewRows = signal<GrnApiResponsePreviewDto[]>([]);
  readonly previewErrorCount = signal<number>(0);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    baseUrl: ['', [Validators.required]],
    httpMethod: ['GET', [Validators.required]],
    authType: ['None' as AuthType, [Validators.required]],
    userName: [''],
    headerName: [''],
    secret: [''],
    extraHeadersJson: ['', [jsonValidator]],
    timeoutSeconds: [30, [Validators.required, Validators.min(1), Validators.max(300)]],
    contentType: ['application/json'],
    requestBodyTemplate: [''],
    responseRootPath: [''],
    isActive: [true],
  });

  get currentAuthType(): AuthType {
    return this.form.controls.authType.value || 'None';
  }

  // Client-side mapping validation errors
  readonly mappingErrors = computed(() => {
    const rows = this.mappingRows();
    const errors: string[] = [];
    const usedTargets = new Set<string>();

    let hasGrnNo = false;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.sourceField || !r.sourceField.trim()) {
        errors.push(`Row ${i + 1}: Source Field cannot be empty.`);
      }
      if (!r.targetColumn) {
        errors.push(`Row ${i + 1}: Target Column must be selected.`);
      } else {
        const colStr = String(r.targetColumn);
        if (usedTargets.has(colStr)) {
          errors.push(`Duplicate Target Column: '${colStr}' is selected multiple times.`);
        }
        usedTargets.add(colStr);

        if (colStr === 'GrnNo') {
          hasGrnNo = true;
          if (!r.isRequired) {
            errors.push("Target Column 'GrnNo' must be marked as required.");
          }
        }
      }
    }

    if (rows.length > 0 && !hasGrnNo) {
      errors.push("Target Column 'GrnNo' is required and must be mapped.");
    }

    return errors;
  });

  ngOnInit(): void {
    this.loadCredentials();
    this.loadTargetColumns();
  }

  loadCredentials(keepSelectionId?: number | null): void {
    this.isLoadingList.set(true);
    this.credService.getAll().subscribe({
      next: (list) => {
        this.credentials.set(list);
        this.isLoadingList.set(false);

        const targetId = keepSelectionId ?? this.selectedId();
        if (targetId && list.some((c) => c.id === targetId)) {
          this.selectCredential(targetId);
        }
      },
      error: () => {
        this.isLoadingList.set(false);
      },
    });
  }

  loadTargetColumns(): void {
    this.targetColumnsError.set(null);
    this.metaService.getTargetColumns().subscribe({
      next: (cols) => {
        this.targetColumns.set(cols);
      },
      error: (err) => {
        this.targetColumnsError.set(err?.error?.detail || err?.message || 'Could not load metadata.');
      },
    });
  }

  selectCredential(id: number): void {
    const cred = this.credentials().find((c) => c.id === id);
    if (!cred) return;

    this.selectedId.set(id);
    this.isNew.set(false);
    this.hasSavedSecret.set(cred.hasSecret);
    this.isReplacingSecret.set(false);
    this.testResult.set(null);
    this.previewRows.set([]);

    const authTypeStr = typeof cred.authType === 'number'
      ? (INT_TO_AUTH[cred.authType] ?? 'None')
      : (cred.authType || 'None');

    this.form.patchValue({
      name: cred.name,
      baseUrl: cred.baseUrl,
      httpMethod: cred.httpMethod,
      authType: authTypeStr as AuthType,
      userName: cred.userName || '',
      headerName: cred.headerName || '',
      secret: '',
      extraHeadersJson: cred.extraHeadersJson || '',
      timeoutSeconds: cred.timeoutSeconds,
      contentType: cred.contentType || 'application/json',
      requestBodyTemplate: cred.requestBodyTemplate || '',
      responseRootPath: cred.responseRootPath || '',
      isActive: cred.isActive,
    });

    this.sampleRootPath.set(cred.responseRootPath || '');
    this.isEditing.set(true);

    this.loadMappings(id);
  }

  openCreateForm(): void {
    this.selectedId.set(null);
    this.isNew.set(true);
    this.hasSavedSecret.set(false);
    this.isReplacingSecret.set(false);
    this.testResult.set(null);
    this.mappingRows.set([]);
    this.previewRows.set([]);

    this.form.reset({
      name: '',
      baseUrl: '',
      httpMethod: 'GET',
      authType: 'None',
      userName: '',
      headerName: '',
      secret: '',
      extraHeadersJson: '',
      timeoutSeconds: 30,
      contentType: 'application/json',
      requestBodyTemplate: '',
      responseRootPath: '',
      isActive: true,
    });

    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.selectedId.set(null);
    this.form.reset();
  }

  onAuthTypeChange(): void {
    // If auth type changed, reset secret replace toggle
    this.isReplacingSecret.set(false);
  }

  saveCredential(): void {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const v = this.form.getRawValue();

    // Secret handling rule: send ONLY when creating or user clicked Replace
    let secretToSend: string | undefined = undefined;
    if (this.isNew()) {
      secretToSend = v.secret?.trim() || undefined;
    } else if (this.isReplacingSecret() && v.secret?.trim()) {
      secretToSend = v.secret.trim();
    }

    const authNum = AUTH_TO_INT[v.authType || 'None'] ?? 0;

    if (this.isNew()) {
      const dto: CreateApiCredentialDto = {
        name: v.name!.trim(),
        baseUrl: v.baseUrl!.trim(),
        httpMethod: v.httpMethod || 'GET',
        authType: authNum,
        userName: v.userName?.trim() || null,
        headerName: v.headerName?.trim() || null,
        secret: secretToSend || null,
        extraHeadersJson: v.extraHeadersJson?.trim() || null,
        timeoutSeconds: v.timeoutSeconds || 30,
        contentType: v.contentType?.trim() || null,
        requestBodyTemplate: v.requestBodyTemplate || null,
        responseRootPath: v.responseRootPath?.trim() || null,
      };

      this.credService.create(dto).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.form.controls.secret.reset(); // clear field immediately
          this.notificationService.showSuccess('Credential Created', `Created ${created.name}`);
          this.loadCredentials(created.id);
        },
        error: () => this.isSaving.set(false),
      });
    } else {
      const id = this.selectedId()!;
      const dto: UpdateApiCredentialDto = {
        name: v.name!.trim(),
        baseUrl: v.baseUrl!.trim(),
        httpMethod: v.httpMethod || 'GET',
        authType: authNum,
        userName: v.userName?.trim() || null,
        headerName: v.headerName?.trim() || null,
        secret: secretToSend, // omitted if user did not replace
        extraHeadersJson: v.extraHeadersJson?.trim() || null,
        timeoutSeconds: v.timeoutSeconds || 30,
        contentType: v.contentType?.trim() || null,
        requestBodyTemplate: v.requestBodyTemplate || null,
        responseRootPath: v.responseRootPath?.trim() || null,
        isActive: !!v.isActive,
      };

      this.credService.update(id, dto).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.form.controls.secret.reset(); // clear field immediately
          this.isReplacingSecret.set(false);
          this.notificationService.showSuccess('Credential Saved', `Updated ${updated.name}`);
          this.loadCredentials(id);
        },
        error: () => this.isSaving.set(false),
      });
    }
  }

  runTestConnection(): void {
    const id = this.selectedId();
    if (!id) return;

    this.isTesting.set(true);
    this.testResult.set(null);

    this.credService.testConnection(id).subscribe({
      next: (res) => {
        this.isTesting.set(false);
        this.testResult.set(res);
        if (res.success) {
          this.notificationService.showSuccess('Test Succeeded', `Response: ${res.statusCode} ${res.reasonPhrase}`);
        } else {
          this.notificationService.showWarning('Test Failed', `Response: ${res.statusCode} ${res.reasonPhrase}`);
        }
      },
      error: () => this.isTesting.set(false),
    });
  }

  // Field Mapping Methods
  loadMappings(id: number): void {
    this.credService.getMappings(id).subscribe({
      next: (mappings) => {
        this.mappingRows.set(
          mappings.map((m) => {
            const colName = toTargetColumnName(m.targetColumn, this.targetColumns());
            return {
              sourceField: m.sourceField,
              targetColumn: colName,
              format: m.format ?? null,
              defaultValue: m.defaultValue ?? null,
              isRequired: colName === 'GrnNo' ? true : m.isRequired,
            };
          }),
        );
      },
    });
  }

  addMappingRow(): void {
    this.mappingRows.update((rows) => [
      ...rows,
      {
        sourceField: '',
        targetColumn: '',
        format: null,
        defaultValue: null,
        isRequired: false,
      },
    ]);
  }

  removeMappingRow(index: number): void {
    this.mappingRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateRowField(index: number, field: keyof UpsertApiFieldMappingDto, val: unknown): void {
    this.mappingRows.update((rows) =>
      rows.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [field]: val };
        if (updated.targetColumn === 'GrnNo') {
          updated.isRequired = true;
        }
        return updated;
      }),
    );
  }

  saveMappings(): void {
    const id = this.selectedId();
    if (!id || this.mappingErrors().length > 0) return;

    this.isSavingMappings.set(true);
    const payload = this.mappingRows().map((row) => ({
      sourceField: row.sourceField.trim(),
      targetColumn: toTargetColumnIndex(row.targetColumn, this.targetColumns()),
      format: row.format?.trim() || null,
      defaultValue: row.defaultValue?.trim() || null,
      isRequired: !!row.isRequired,
    }));

    this.credService.replaceMappings(id, payload).subscribe({
      next: () => {
        this.isSavingMappings.set(false);
        this.notificationService.showSuccess('Mappings Saved', 'Field mappings updated successfully.');
        this.loadMappings(id);
      },
      error: () => this.isSavingMappings.set(false),
    });
  }

  // Preview Mapping Methods
  loadDevSample(): void {
    this.sampleJsonInput.set(DEV_SAMPLE_JSON);
    this.sampleRootPath.set('data.items');
  }

  runSamplePreview(): void {
    const json = this.sampleJsonInput();
    if (!json.trim()) {
      this.notificationService.showWarning('Sample JSON Required', 'Please enter or load sample JSON first.');
      return;
    }

    this.isPreviewingSample.set(true);
    this.previewRows.set([]);

    const payloadMappings = this.mappingRows().map((row) => ({
      sourceField: row.sourceField.trim(),
      targetColumn: toTargetColumnIndex(row.targetColumn, this.targetColumns()),
      format: row.format?.trim() || null,
      defaultValue: row.defaultValue?.trim() || null,
      isRequired: !!row.isRequired,
    }));

    this.credService
      .previewSample({
        json,
        responseRootPath: this.sampleRootPath().trim() || null,
        mappings: payloadMappings,
      })
      .subscribe({
        next: (res) => {
          this.isPreviewingSample.set(false);
          this.previewRows.set(res.rows);
          this.previewErrorCount.set(res.errorRowsCount);
        },
        error: () => this.isPreviewingSample.set(false),
      });
  }

  formatAuthType(authType: AuthType): string {
    if (typeof authType === 'number') {
      return INT_TO_AUTH[authType] ?? String(authType);
    }
    return authType || 'None';
  }

  runLivePreview(): void {
    const id = this.selectedId();
    if (!id) return;

    this.isPreviewingLive.set(true);
    this.previewRows.set([]);

    this.credService.previewLiveMapping(id).subscribe({
      next: (res) => {
        this.isPreviewingLive.set(false);
        this.previewRows.set(res.rows);
        const errs = res.rows.filter((r) => !!r.errorMessage).length;
        this.previewErrorCount.set(errs);
      },
      error: () => this.isPreviewingLive.set(false),
    });
  }

  copyText(text: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.notificationService.showSuccess('Copied', 'Preview text copied to clipboard.');
    }
  }
}
