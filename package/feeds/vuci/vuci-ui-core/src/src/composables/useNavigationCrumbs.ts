import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { menu } from '@/plugins/menu'
import type { BreadCrumbItem } from '@/components/VuciLayout/src/TltBreadcrumbs.vue'

export function useNavigationCrumbs() {
  const route = useRoute()

  const allCrumbs = computed<BreadCrumbItem[]>(() => {
    const currentPath = route.path
    const menuItem = menu.findMenuItem(currentPath)
    if (!menuItem) return []

    return (
      menuItem.meta.route.map(
        (r): BreadCrumbItem => ({
          path: r.path,
          name: r.title
        })
      ) || []
    )
  })

  const defaultCrumbs = computed<BreadCrumbItem[]>(() => {
    return allCrumbs.value.slice(0, 3)
  })

  return {
    allCrumbs,
    defaultCrumbs
  }
}
