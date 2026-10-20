import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ExcelImportWizardComponent } from './excel-import-wizard.component';
import {
  ExcelImportService,
  ImportResultDto,
  ImportWizardConfig,
} from '../../../core/api/excel-import.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('ExcelImportWizardComponent', () => {
  let component: ExcelImportWizardComponent;
  let fixture: ComponentFixture<ExcelImportWizardComponent>;
  let excelService: ExcelImportService;
  let notificationService: NotificationService;

  const mockConfig: ImportWizardConfig = {
    title: 'Import Materials from Excel',
    resourceName: 'Materials',
    templateUrl: '/api/materials/import-template',
    importUrl: '/api/materials/import',
    templateFileName: 'materials-template.xlsx',
  };

  const mockDryRunSuccessResult: ImportResultDto = {
    total: 10,
    newCount: 6,
    existsCount: 3,
    errorCount: 1,
    imported: 0,
    updated: 0,
    skipped: 0,
    rows: [
      { rowNumber: 2, code: 'MAT-001', status: 'New', message: 'Ready to import.' },
      { rowNumber: 3, code: 'MAT-002', status: 'New', message: 'Ready to import.' },
      { rowNumber: 4, code: 'MAT-003', status: 'Exists', message: 'Code already exists.' },
      { rowNumber: 5, code: 'MAT-004', status: 'Error', message: 'UoM is required.' },
    ],
  };

  const mockCommitSuccessResult: ImportResultDto = {
    total: 10,
    newCount: 6,
    existsCount: 3,
    errorCount: 1,
    imported: 6,
    updated: 0,
    skipped: 4,
    rows: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcelImportWizardComponent],
      providers: [
        {
          provide: ExcelImportService,
          useValue: {
            downloadTemplate: vi.fn().mockReturnValue(of(new Blob(['dummy'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
            saveBlob: vi.fn(),
            executeImport: vi.fn().mockReturnValue(of(mockDryRunSuccessResult)),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showWarning: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcelImportWizardComponent);
    component = fixture.componentInstance;
    component.config = mockConfig;
    excelService = TestBed.inject(ExcelImportService);
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  describe('File Validation Checks (type and size)', () => {
    it('should reject non-xlsx files with a clear error message', () => {
      const csvFile = new File(['code,name'], 'materials.csv', { type: 'text/csv' });
      component.handleFile(csvFile);

      expect(component.selectedFile()).toBeNull();
      expect(component.fileError()).toContain('Only .xlsx Excel files are supported');
    });

    it('should reject files exceeding 2 MB with a clear error message', () => {
      // Create a 2.5 MB fake file
      const largeContent = new Uint8Array(2.5 * 1024 * 1024);
      const largeFile = new File([largeContent], 'large-materials.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      component.handleFile(largeFile);

      expect(component.selectedFile()).toBeNull();
      expect(component.fileError()).toContain('exceeds the maximum allowed limit of 2 MB');
    });

    it('should accept a valid .xlsx file under 2 MB', () => {
      const validFile = new File(['fake-content'], 'materials.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      component.handleFile(validFile);

      expect(component.selectedFile()).toBe(validFile);
      expect(component.fileError()).toBeNull();
    });
  });

  describe('Template Download (HttpClient Blob)', () => {
    it('should download template via HttpClient blob and save it without window.open', () => {
      component.downloadTemplate();

      expect(excelService.downloadTemplate).toHaveBeenCalledWith(
        mockConfig.templateUrl,
        mockConfig.templateFileName,
      );
      expect(excelService.saveBlob).toHaveBeenCalled();
      expect(notificationService.showSuccess).toHaveBeenCalledWith(
        'Template Downloaded',
        expect.stringContaining('materials-template.xlsx'),
      );
    });

    it('should handle template download failure gracefully', () => {
      vi.spyOn(excelService, 'downloadTemplate').mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      component.downloadTemplate();

      expect(notificationService.showError).toHaveBeenCalledWith(
        'Download Failed',
        expect.any(String),
      );
      expect(component.isDownloadingTemplate()).toBe(false);
    });
  });

  describe('Step Flow & Automatic DryRun', () => {
    it('should start at Step 1 and transition to Step 2 with automatic dryRun preview', () => {
      const validFile = new File(['valid'], 'items.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      component.handleFile(validFile);

      component.goToStep2();

      expect(component.currentStep()).toBe(2);
      expect(excelService.executeImport).toHaveBeenCalledWith(
        mockConfig.importUrl,
        validFile,
        'CreateOnly',
        true, // dryRun = true
        false,
      );
      expect(component.previewResult()).toEqual(mockDryRunSuccessResult);
      expect(component.isCapped()).toBe(true); // 4 rows returned < 10 total
    });

    it('should navigate back and forth through steps', () => {
      const validFile = new File(['valid'], 'items.xlsx');
      component.handleFile(validFile);

      component.goToStep2();
      expect(component.currentStep()).toBe(2);

      component.goToStep3();
      expect(component.currentStep()).toBe(3);

      component.goToPreviousStep();
      expect(component.currentStep()).toBe(2);

      component.goToPreviousStep();
      expect(component.currentStep()).toBe(1);
    });
  });

  describe('Error Filter & Paging in Step 2', () => {
    beforeEach(() => {
      const validFile = new File(['valid'], 'items.xlsx');
      component.handleFile(validFile);
      component.goToStep2();
    });

    it('should filter rows by Errors only when checkbox is toggled', () => {
      expect(component.filteredRows().length).toBe(4);

      component.toggleErrorsOnly();
      expect(component.errorsOnlyFilter()).toBe(true);
      expect(component.filteredRows().length).toBe(1);
      expect(component.filteredRows()[0].status).toBe('Error');

      component.toggleErrorsOnly();
      expect(component.errorsOnlyFilter()).toBe(false);
      expect(component.filteredRows().length).toBe(4);
    });

    it('should paginate preview rows by 50 per page', () => {
      expect(component.previewPage()).toBe(1);
      expect(component.totalPages()).toBe(1);
      expect(component.rangeStart()).toBe(1);
      expect(component.rangeEnd()).toBe(4);
    });
  });

  describe('Disabled Rules for Import Button in Step 3', () => {
    const validFile = new File(['valid'], 'items.xlsx');

    it('should be disabled when errors exist and Skip Invalid Rows is unticked', () => {
      component.handleFile(validFile);
      component.goToStep2();
      component.goToStep3();

      expect(component.previewResult()?.errorCount).toBe(1);
      expect(component.skipInvalidRows()).toBe(false);
      expect(component.isImportDisabled()).toBe(true);

      // Ticking skipInvalidRows enables the import button
      component.toggleSkipInvalidRows();
      expect(component.skipInvalidRows()).toBe(true);
      expect(component.isImportDisabled()).toBe(false);
    });

    it('should be disabled when nothing valid exists', () => {
      const zeroValidResult: ImportResultDto = {
        total: 2,
        newCount: 0,
        existsCount: 0,
        errorCount: 2,
        imported: 0,
        updated: 0,
        skipped: 0,
        rows: [
          { rowNumber: 2, code: 'MAT-ERR1', status: 'Error', message: 'Invalid' },
          { rowNumber: 3, code: 'MAT-ERR2', status: 'Error', message: 'Invalid' },
        ],
      };

      vi.spyOn(excelService, 'executeImport').mockReturnValue(of(zeroValidResult));

      component.handleFile(validFile);
      component.goToStep2();
      component.goToStep3();

      component.skipInvalidRows.set(true);
      expect(component.validCount()).toBe(0);
      expect(component.isImportDisabled()).toBe(true);
    });

    it('should execute commit with same File object and emit imported event on success', () => {
      vi.spyOn(excelService, 'executeImport').mockReturnValue(of(mockCommitSuccessResult));
      const importSpy = vi.spyOn(component.imported, 'emit');

      component.handleFile(validFile);
      component.goToStep2();
      component.goToStep3();
      component.skipInvalidRows.set(true);

      component.executeCommit();

      expect(excelService.executeImport).toHaveBeenCalledWith(
        mockConfig.importUrl,
        validFile,
        'CreateOnly',
        false, // dryRun = false
        true,  // skipInvalidRows = true
      );
      expect(component.importSuccessResult()).toEqual(mockCommitSuccessResult);
      expect(importSpy).toHaveBeenCalledWith(mockCommitSuccessResult);
      expect(notificationService.showSuccess).toHaveBeenCalledWith(
        'Import Successful',
        expect.stringContaining('6 imported'),
      );
    });
  });
});
