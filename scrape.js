require('dotenv').config();
const puppeteer = require('puppeteer')
const fastify = require('fastify')({
  logger: true
})
const username = process.env.EMBERPULSE_USERNAME
const password = process.env.EMBERPULSE_PASSWORD
async function scrape() {
  const browser = await puppeteer.launch({
		'args' : [
			'--no-sandbox',
			'--disable-setuid-sandbox'
		]
	});
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 720});
  await page.goto('https://emberpulse.com.au/login', { waitUntil: 'networkidle0' }); // wait until page load
  await page.type('#username', username);
  await page.type('#password', password);

  // click and wait for navigation
  await Promise.all([
    page.click('[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);
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
fastify.get('/data', async function (request, reply) {
  reply.send(await scrape())
})

// Run the server!
fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})