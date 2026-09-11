import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import NotFound from './NotFound.jsx'

afterEach(cleanup)

it('shows the not-found message and a link back to the menu', () => {
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  )
  expect(screen.getByText('页面不存在')).toBeTruthy()
  expect(screen.getByRole('link', { name: '回到菜单' })).toBeTruthy()
})
