import dotenv from 'dotenv'
import puppeteer from 'puppeteer'
import Fastify from 'fastify'

dotenv.config()

const fastify = Fastify({ logger: true })
const username = process.env.EMBERPULSE_USERNAME
const password = process.env.EMBERPULSE_PASSWORD
console.log(`Using node: ${process.version}`)

async function scrape() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 720});
	console.info("Loading Emberpulse...")
	console.log("Authenticating with: " + username)
  await page.goto('https://emberpulse.com.au/login', { waitUntil: 'networkidle0' }); // wait until page load
	console.info("Authenticating...")
  await page.type('#username', username);
  await page.type('#password', password);

  // click and wait for navigation
	page.click('[type="submit"]')
	console.info("Awaiting Data...")
	await page.waitForNavigation({ waitUntil: 'networkidle0' })
	await page.waitForSelector('#home-icon-readout')

	// Power Data
	const currentUsage = parseInt(await page.$eval('#home-icon-readout', element => element.textContent))
	const generating = parseInt(await page.$eval('#solar-icon-readout', element => element.textContent))
	const grid = parseInt(await page.$eval('#grid-icon-readout', element => element.textContent))
	const gridDirection = await (await page.$eval('#grid-icon-direction', element => element.textContent)).toLowerCase()
	
	await browser.close()
	return({
		currentUsage: currentUsage,
		generating: generating,
		exporting: gridDirection === 'exporting' ? grid : 0,
		importing: gridDirection !== 'exporting' ? grid : 0
	})
}

fastify.get('/emberpulse', async (request, reply) => {
  return await scrape()
})
const start = async () => {
  try {
    await fastify.listen(80)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()