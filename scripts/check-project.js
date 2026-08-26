const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const miniprogramRoot = path.join(root, 'miniprogram')
const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
const app = JSON.parse(fs.readFileSync(path.join(miniprogramRoot, 'app.json'), 'utf8'))
const failures = []

if (project.miniprogramRoot !== 'miniprogram/') {
  failures.push('project.config.json miniprogramRoot must be miniprogram/')
}

for (const page of app.pages) {
  for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
    const file = path.join(miniprogramRoot, `${page}${extension}`)
    if (!fs.existsSync(file)) failures.push(`Missing page file: ${page}${extension}`)
  }
}

for (const item of app.tabBar.list) {
  if (!app.pages.includes(item.pagePath)) failures.push(`Unknown tab page: ${item.pagePath}`)
  for (const key of ['iconPath', 'selectedIconPath']) {
    if (item[key] && !fs.existsSync(path.join(miniprogramRoot, item[key]))) {
      failures.push(`Missing tab asset: ${item[key]}`)
    }
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(fullPath)
    if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        JSON.parse(fs.readFileSync(fullPath, 'utf8'))
      } catch (error) {
        failures.push(`Invalid JSON: ${path.relative(root, fullPath)} (${error.message})`)
      }
    }
  }
}

walk(miniprogramRoot)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Project check passed: ${app.pages.length} pages, ${app.tabBar.list.length} tabs`)
}
