# Angular Frontend Architecture & Implementation Guide

This document outlines the structure, module setup, and user onboarding integration (`driver.js`) for the Angular frontend of our inventory management system.

---

## 1. Project Directory Structure

Following modular Angular best practices, we will structure the workspace to keep features decoupled and easily maintainable.

```text
src/
├── app/
│   ├── core/                      # Singletons, interceptors, guards, global services
│   │   ├── services/
│   │   │   └── api.service.ts     # HttpClient wrapper for .NET Core Web API
│   │   └── models/
│   │       └── inventory.model.ts # TypeScript interfaces matching C# DTOs
│   │
│   ├── features/                  # Lazy-loaded feature modules or standalone components
│   │   ├── dashboard/             # Warehouse analytics & metric cards
│   │   │   ├── dashboard.component.ts
│   │   │   └── dashboard.component.html
│   │   └── scanner/               # Barcode scanning module
│   │       ├── scanner.component.ts
│   │       └── scanner.component.html
│   │
│   ├── shared/                    # Reusable UI components, pipes, directives
│   │   └── components/
│   │       └── navbar/
│   │
│   ├── app.component.ts
│   ├── app.routes.ts              # Routing configuration
│   └── app.config.ts              # Providers (HttpClient, Animations, etc.)
├── assets/
└── styles.scss
```

---

## 2. Core Models (`src/app/core/models/inventory.model.ts`)

Define your TypeScript interfaces to seamlessly map payloads coming from and going to the .NET Core backend:

```typescript
export interface ScanRequest {
  barcode: string;
  scanType: 'IN' | 'OUT';
  scannedBy: string;
}

export interface InventoryItem {
  id: number;
  barcode: string;
  itemDetails: string;
  currentStatus: 'IN' | 'OUT';
}

export interface InventoryTransaction {
  transactionId: number;
  barcode: string;
  transactionType: 'IN' | 'OUT';
  scannedDate: string;
  scannedBy: string;
}
```

---

## 3. Integrating `driver.js` for User Onboarding

To fulfill your requirement for interactive product tours (guiding users through the barcode scanner and dashboard metrics), we will install and configure `driver.js`.

### Step 3.1: Installation
Run the following command in your Angular project root:
```bash
npm install driver.js
```

### Step 3.2: Creating a Tour Service (`src/app/core/services/tour.service.ts`)
Encapsulate the `driver.js` logic in a reusable service so you can trigger walkthroughs on different pages:

```typescript
import { Injectable } from '@angular/core';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

@Injectable({
  providedIn: 'root'
})
export class TourService {
  
  public startDashboardTour(): void {
    const driverObj = driver({
      showProgress: true,
      steps: [
        { 
          element: '#metric-cards', 
          popover: { title: 'Live Metrics', description: 'View real-time stock levels, items checked in, and items checked out.', side: 'bottom', align: 'start' } 
        },
        { 
          element: '#scanner-nav-btn', 
          popover: { title: 'Barcode Scanner', description: 'Click here to switch to the camera or hardware scanner view.', side: 'bottom', align: 'start' } 
        },
        { 
          element: '#recent-transactions', 
          popover: { title: 'Audit Trail', description: 'Every inward and outward movement is logged here with timestamps and user details.', side: 'top', align: 'start' } 
        }
      ]
    });

    driverObj.drive();
  }
}
```

### Step 3.3: Triggering the Tour in a Component
In your `DashboardComponent`, you can inject the `TourService` and offer a "Take Tour" help button:

```typescript
import { Component, OnInit } from '@angular/core';
import { TourService } from '../../core/services/tour.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  constructor(private tourService: TourService) {}

  ngOnInit(): void {
    // Optional: Auto-trigger for first-time visitors
    if (!localStorage.getItem('has_seen_tour')) {
      this.tourService.startDashboardTour();
      localStorage.setItem('has_seen_tour', 'true');
    }
  }

  public launchTour(): void {
    this.tourService.startDashboardTour();
  }
}
```

---

## 4. Barcode Scanner Integration (`zxing-scanner`)

For the scanning view, install the Angular ZXing package:
```bash
npm install @zxing/ngx-scanner @zxing/library
```
You can then bind the scanner output directly to your API service, passing the scanned barcode string alongside the user ID to execute the `IN` or `OUT` transaction instantly.