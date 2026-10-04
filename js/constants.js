import { CoPrProtocol, CoPrProtocol_Version } from './protocol/countProtocol.js'

export const protocolClient    = new CoPrProtocol()
export const protocolVersion   = CoPrProtocol_Version

export const signalLeave       = '__SYS_LEAVE__'
export const signalJoin        = '__SYS_JOIN__'
export const signalDelete      = '__SYS_DELETE__'
export const signalClearPrefix = '__SYS_CLEAR__:'
export const litterboxMaxBytes = 1024 * 1024 * 1024 // 1 GB

export const avatarColors = [
  '#dc2626', '#b91c1c', '#991b1b', '#e11d48', '#be123c', '#9f1239', '#e54666', '#ca244d',
  '#e54d2e', '#d93d1a', '#dd4b25', '#c53030', '#ea580c', '#c2410c', '#9a3412', '#d97706',
  '#b45309', '#92400e', '#cd6e00', '#ca8a04', '#a16207', '#854d0e', '#65a30d', '#4d7c0f',
  '#3f6212', '#16a34a', '#15803d', '#166534', '#059669', '#047857', '#065f46', '#29a383',
  '#238e71', '#198754', '#0d9488', '#0f766e', '#115e59', '#0891b2', '#0e7490', '#155e75',
  '#0284c7', '#0369a1', '#075985', '#007791', '#0e639c', '#2563eb', '#1d4ed8', '#1e40af',
  '#1a56db', '#0969da', '#5865f2', '#5b5bd6', '#4f46e5', '#4338ca', '#3730a3', '#5145cd',
  '#7c3aed', '#6d28d9', '#5b21b6', '#9333ea', '#7e22ce', '#6b21a8', '#ab4aba', '#9c3baa',
  '#c026d3', '#a21caf', '#86198f', '#db2777', '#be185d', '#9d174d', '#e93d82', '#df2771'
]