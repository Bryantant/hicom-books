import { t } from 'fyo';
import type { DropdownOptions } from 'frappe-ui';
import { fyo } from 'src/initFyo';
import { call } from 'src/web/api';
import { getDocsUrl, PRODUCT_NAME, SOURCE_URL } from './hicomBrand';
import { showDialog } from './interactive';
import { docsPathRef } from './refs';
import { deskTheme, setDeskTheme, type DeskTheme } from './theme';

/** Phones have no keyboard shortcuts, so they pass no `openShortcuts`. */
export function getAppMenuItems(openShortcuts?: () => void): DropdownOptions {
  const shortcuts = openShortcuts
    ? [
        {
          label: t`Keyboard shortcuts`,
          icon: 'lucide-command',
          onClick: openShortcuts,
        },
      ]
    : [];

  // The help group's heading names the Books version, for support.
  const version = fyo.store.appVersion;
  return [
    {
      group: version ? `${PRODUCT_NAME} ${version}` : t`Help`,
      hideLabel: !version,
      options: [
        {
          label: t`Documentation`,
          icon: 'lucide-circle-help',
          onClick: openDocumentation,
        },
        ...shortcuts,
        {
          label: t`License & Source Code`,
          icon: 'lucide-scale',
          onClick: showLicense,
        },
      ],
    },
    {
      group: t`Account`,
      hideLabel: true,
      options: [
        {
          label: t`Theme`,
          icon: 'lucide-sun-moon',
          submenu: getThemeItems(),
        },
        // Only Administrator may leave /books for the desk; everyone else is sent back.
        ...(window.frappe?.boot?.user?.name === 'Administrator'
          ? [
              {
                label: t`Apps`,
                icon: 'lucide-layout-grid',
                onClick: () => window.location.assign('/apps'),
              },
            ]
          : []),
        { label: t`Log out`, icon: 'lucide-log-out', onClick: logOut },
      ],
    },
  ];
}

function getThemeItems(): DropdownOptions {
  const themes: [DeskTheme, string][] = [
    ['Light', t`Light`],
    ['Dark', t`Dark`],
    ['Automatic', t`Automatic`],
  ];
  return themes.map(([theme, label]) => ({
    label,
    selected: deskTheme.value === theme,
    onClick: () => setDeskTheme(theme),
  }));
}

export function openDocumentation() {
  window.open(
    getDocsUrl(docsPathRef.value || 'books'),
    '_blank',
    'noopener,noreferrer'
  );
}

/** The license notice and source offer that the GNU AGPL asks every user to be shown. */
export async function showLicense() {
  await showDialog({
    title: t`License & Source Code`,
    detail: [
      t`${PRODUCT_NAME} is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License, version 3.`,
      t`It is distributed WITHOUT ANY WARRANTY; see the license for details.`,
      t`Source code: ${SOURCE_URL}`,
    ],
    type: 'info',
    buttons: [
      {
        label: t`View Source`,
        isPrimary: true,
        action: () => window.open(SOURCE_URL, '_blank', 'noopener,noreferrer'),
      },
      { label: t`Close`, action: () => null, isEscape: true },
    ],
  });
}

async function logOut() {
  await call('logout');
  window.location.assign('/login');
}
