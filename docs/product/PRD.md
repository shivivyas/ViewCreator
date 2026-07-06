# ViewCreator PRD (Product Requirements Document)

# Executive Summary

ViewCreator is not an image editor.

ViewCreator is an AI-powered marketing content operating system that enables marketers, founders, agencies, and creators to go from:

**Inspiration → Branded Creative → Publication**

in minutes.

Unlike Canva, Photoshop, or Figma, ViewCreator does not optimize for manual design.

Unlike Midjourney, Ideogram, or ChatGPT Image, ViewCreator does not optimize for creative exploration.

ViewCreator optimizes for:

> Getting marketing assets published as quickly as possible.

The product combines:

* Template discovery
* AI generation
* AI-guided refinement
* Asset organization
* Social publishing

into a single workflow.

---

# Product Vision

## Vision Statement

Enable anyone to create and publish professional marketing content in under 5 minutes.

---

# Core User Problem

Current workflow:

1. Search inspiration
2. Open Canva
3. Search template
4. Modify text
5. Modify images
6. Download
7. Open Buffer/Hootsuite
8. Schedule post

Total time:

30-90 minutes

Desired workflow:

1. Find inspiration
2. Describe business
3. Generate branded variants
4. Make 1-2 refinements
5. Publish

Target time:

< 5 minutes

---

# Product Principles

## Principle 1

AI First

Users should rarely need manual editing.

---

## Principle 2

Intent > Controls

Users express goals.

System translates goals into editing operations.

---

## Principle 3

Fastest Path To Publish

Every feature should reduce:

Time To First Publish

---

## Principle 4

Inspiration Driven

Templates are inspiration.

Templates are not static assets.

---

## Principle 5

No Canva Syndrome

Avoid:

* Layers panel
* 100 controls
* Complex toolbars
* Design software complexity

---

# Primary Users

## SMB Owners

Need:

* Instagram posts
* Facebook ads
* Promotional creatives

---

## Content Creators

Need:

* Reels covers
* YouTube thumbnails
* LinkedIn graphics

---

## Marketing Agencies

Need:

* High-volume asset production
* Template reuse
* Team workflows

---

## Ecommerce Brands

Need:

* Product promotions
* Seasonal campaigns
* Product launches

---

# Success Metrics

## Primary Metric

Median Time To First Publish

Definition:

Time from template selection to final asset download/publish.

Target:

< 5 minutes

---

## Secondary Metrics

Generated assets per user

Published assets per user

Template reuse rate

Template creation rate

Retention

---

# Product Architecture

ViewCreator consists of 5 major modules.

---

# 1. Discover

Purpose:

Find inspiration.

User mindset:

"I need something like this."

---

Features:

Template Gallery

Template Search

Categories

Trending Templates

Community Templates

Personal Templates

Saved Templates

---

# 2. Generate

Purpose:

Generate branded versions.

User mindset:

"Make this work for my business."

---

Input:

Template

Prompt

Brand information

References

---

Output:

Multiple variations

---

# 3. Refine

Purpose:

Improve generated creatives.

User mindset:

"Almost perfect."

---

Important:

Not Photoshop.

Not Canva.

---

Refinement should happen through:

Intent-based editing.

---

# 4. Organize

Purpose:

Manage assets.

User mindset:

"Where are my creatives?"

---

Contains:

Projects

Campaigns

Versions

Templates

Assets

History

---

# 5. Publish

Purpose:

Distribute content.

User mindset:

"Ship it."

---

Contains:

Download

Export

Scheduling

Publishing

Analytics

---

# MVP Scope

Launch only:

Discover

Generate

Refine

Download

No scheduling.

No publishing.

No analytics.

---

# Template System

## Definition

A template is NOT an image.

A template consists of:

Visual Style

Layout Structure

Typography Structure

AI Metadata

Generation Constraints

Editable Regions

Prompt Guidance

---

Schema:

Template

├── previewImage

├── styleDescription

├── promptTemplate

├── editableRegions

├── aiConstraints

├── categories

├── tags

└── creator

---

# Template Gallery

Current page remains.

Enhancements:

Search

Tags

Personal Templates

Public Templates

Template Author

Template Popularity

Use Count

Favorite

---

# Template Detail Modal

Purpose:

Quick Create

Not full editing.

---

Current Problem

Modal is a preview only.

Too passive.

---

New Modal Goal

Generate content immediately.

---

Layout

LEFT

Template Preview

Template Details

Tags

---

RIGHT

Prompt Input

Brand Context

Generate Button

Generated Variations

---

Workflow

User clicks template

↓

Modal opens

↓

Types:

"Craft beer promotion for summer"

↓

Generate

↓

Receives variations

↓

Choose variation

↓

Open Workspace

or

Save Asset

---

Modal Should NOT Include

History

Publishing

Advanced editing

Projects

Campaigns

---

# Workspace (formerly AI Studio)

Rename:

Workspace

Recommended.

---

Purpose

Where actual work happens.

---

Contains

Generated assets

Editing

History

Publishing

Templates

Exports

Projects

---

# Workspace Layout

LEFT SIDEBAR

Projects

Templates

Assets

History

---

CENTER

Selected Asset

---

RIGHT PANEL

Contextual Editing

---

TOP BAR

Save

Download

Publish

Make Template

Favorite

Delete

---

# Generation Workflow

User selects template

↓

Prompt

↓

Generate 4 variations

↓

Choose one

↓

Open Workspace

↓

Refine

↓

Download

---

# AI Refinement System

Most important feature.

---

DO NOT BUILD

Photoshop

Canva

Layer editor

---

BUILD

Intent Editor

---

Editing Philosophy

Users describe intent.

System converts intent into structured operations.

---

Examples

Replace burger with fries

↓

Operation

Replace Object

Object

Burger

Replacement

Fries

---

Move headline higher

↓

Operation

Move Text

Object

Headline

Direction

Up

---

Change background to blue

↓

Operation

Modify Background

Value

Blue

---

# Context-Aware Editing

User clicks element.

Floating menu appears.

---

Image Object

Replace

Remove

Move

Resize

Restyle

---

Text Object

Rewrite

Move

Resize

Change Style

---

Background

Replace

Expand

Restyle

Blur

---

# Editing Pipeline

Step 1

User selects object

Step 2

Choose action

Step 3

Describe intent

Step 4

AI executes

Step 5

Preview

Step 6

Accept or revert

---

# Edit Recipes

Replace traditional history.

---

Current

History

Edit 1

Edit 2

Edit 3

---

New

Recipe

Original

↓

Replace Burger

↓

Move Product

↓

Add CTA

↓

Improve Background

---

Benefits

Understandable

Reusable

Composable

---

Recipe Actions

Editable

Re-runnable

Duplicatable

Removable

---

# Asset Versions

Every edit creates version.

Version tree:

Original

├── Version A

├── Version B

└── Version C

---

Users can revert anytime.

---

# Asset Actions

Favorite

Delete

Download PNG

Download JPG

Duplicate

Make Template

Open Workspace

---

# Template Creation

Two Sources

---

Method 1

Upload Image

User uploads existing design.

System analyzes:

Layout

Typography

Colors

Objects

Composition

Style

---

Creates template automatically.

---

Method 2

Generate Asset

↓

Save As Template

↓

Personal or Public

---

# Template Types

Public

Visible to everyone.

---

Personal

Visible only to creator.

---

# Template Moderation

Public templates require approval.

Future phase.

---

# Brand System (Post MVP)

Brand Kit

Logo

Colors

Fonts

Tone

Product Information

CTA Preferences

---

Brand applied automatically during generation.

---

# Publishing Roadmap

Phase 1

Download only

PNG

JPG

ZIP

---

Phase 2

Connect Accounts

Instagram

LinkedIn

Facebook

---

Phase 3

Scheduling

Single platform

---

Phase 4

Multi-platform scheduler

Buffer competitor

---

Phase 5

Calendar

Campaign planning

Analytics

---

# MVP Launch Scope

Must Have

Template Gallery

Template Modal

Prompt Generation

Asset Variations

Workspace

Intent Editing

Version History

Download PNG/JPG

Save Personal Template

---

Should Have

Favorites

Template Search

Public Templates

---

Not MVP

Social publishing

Scheduling

Analytics

Team collaboration

Video generation

Brand kit

Campaign management

---

# V2 Roadmap

Brand Kit

Public Template Marketplace

Template Moderation

Publishing Integrations

Social Scheduling

Asset Collections

Campaigns

---

# V3 Roadmap

AI Campaign Generation

Multi-platform adaptation

Auto-generated captions

Publishing calendar

Performance analytics

Agency workspaces

Collaboration

Approvals

---

# Long-Term Vision

A marketer should be able to type:

"Launch a Father's Day campaign for my coffee brand."

And ViewCreator automatically:

1. Finds suitable templates
2. Generates multiple creatives
3. Creates captions
4. Creates platform-specific variants
5. Schedules publication
6. Tracks performance

Without opening any other tool.

At maturity, ViewCreator becomes:

**The operating system for AI-powered social media marketing.**
