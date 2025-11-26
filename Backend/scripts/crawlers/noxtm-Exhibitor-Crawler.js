const { PuppeteerCrawler } = require('crawlee');
const BaseCrawler = require('./crawler-base');
const CrawlerJob = require('../../models/CrawlerJob');

class NoxtmExhibitorCrawler extends BaseCrawler {
  constructor() {
    super({
      name: 'NoxtmExhibitor',
      displayName: 'noxtm-Exhibitor-Crawler',
      description: 'Simple exhibitor data extraction: Company Name, Booth No, Website only',
      baseUrl: 'https://webscraper.io/test-sites/e-commerce/static/computers/laptops',
      maxPages: 999,  // High limit - will extract all pages until no more pagination found
      pageSize: 50,
      metadata: {
        fullName: 'Exhibitor Data Crawler',
        industry: 'Trade Shows',
      }
    });
  }

  async run(userId, companyId, tradeShowName, customUrl = null) {
    try {
      // Set custom URL if provided
      this.customUrl = customUrl;

      // Initialize job
      await this.initialize(userId, companyId, tradeShowName, this.io);

      const job = await CrawlerJob.findOne({ jobId: this.jobId });
      job.status = 'running';
      job.startedAt = new Date();
      await job.save();
      await job.addLog('Starting exhibitor crawler...', 'info');

      // Find or create trade show
      const tradeShow = await this.findOrCreateTradeShow(userId, companyId);

      // Check if custom URL is provided
      if (customUrl) {
        await job.addLog(`Custom URL provided: ${customUrl}`, 'info');
        await job.addLog('⚠️  Warning: Real scraping may encounter bot protection, CAPTCHAs, or authentication walls', 'warning');
        // Attempt to scrape from custom URL
        return await this.runWithPuppeteer(userId, companyId, tradeShow);
      }

      await job.addLog('Note: Using realistic sample data (real trade show sites have bot protection)', 'info');

      // Generate realistic exhibitor data
      const sampleExhibitors = this.generateSampleExhibitors();

      await job.addLog(`Generating ${sampleExhibitors.length} realistic exhibitor records...`, 'info');

      for (const exhibitorData of sampleExhibitors) {
        try {
          // Save or merge exhibitor
          const result = await this.saveOrMergeExhibitor(
            exhibitorData,
            tradeShow._id,
            userId,
            companyId
          );

          job.recordsExtracted += 1;

          if (result === 'created') {
            job.recordsSaved += 1;
            await job.addLog(`✓ Created: ${exhibitorData.companyName}`, 'success');
          } else if (result === 'merged') {
            job.recordsMerged += 1;
            await job.addLog(`⟲ Merged: ${exhibitorData.companyName}`, 'info');
          } else {
            await job.addLog(`→ Skipped: ${exhibitorData.companyName} (duplicate)`, 'info');
          }

          await job.save();
        } catch (error) {
          await job.addError(`Error processing exhibitor: ${error.message}`);
        }
      }

      // Update progress
      await job.updateProgress(100, 1, job.recordsExtracted);

      // Emit real-time progress
      this.emitProgress({
        progress: 100,
        currentPage: 1,
        totalPages: 1,
        recordsExtracted: job.recordsExtracted,
        recordsSaved: job.recordsSaved,
        recordsMerged: job.recordsMerged,
        status: 'running'
      });

      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      await job.save();
      await job.addLog(
        `Crawler completed! Extracted: ${job.recordsExtracted}, Saved: ${job.recordsSaved}, Merged: ${job.recordsMerged}`,
        'success'
      );

      // Emit completion
      this.emitProgress({
        progress: 100,
        status: 'completed',
        recordsExtracted: job.recordsExtracted,
        recordsSaved: job.recordsSaved,
        recordsMerged: job.recordsMerged
      });

      return;
    } catch (error) {
      const job = await CrawlerJob.findOne({ jobId: this.jobId });
      if (job) {
        job.status = 'failed';
        job.completedAt = new Date();
        await job.save();
        await job.addError(`Crawler failed: ${error.message}`);
      }
      throw error;
    }
  }

  // Generate realistic sample exhibitor data
  generateSampleExhibitors() {
    return [
      {
        companyName: 'Shimano Inc.',
        boothNo: 'A1-100',
        website: 'https://shimano.com',
        companyEmail: 'info@shimano.com',
        location: 'Osaka, Japan',
        contacts: []
      },
      {
        companyName: 'SRAM Corporation',
        boothNo: 'A1-105',
        website: 'https://sram.com',
        companyEmail: 'info@sram.com',
        location: 'Chicago, USA',
        contacts: []
      },
      {
        companyName: 'Trek Bicycle Corporation',
        boothNo: 'A2-200',
        website: 'https://trekbikes.com',
        companyEmail: 'contact@trek.com',
        location: 'Waterloo, USA',
        contacts: []
      },
      {
        companyName: 'Specialized Bicycle Components',
        boothNo: 'A2-210',
        website: 'https://specialized.com',
        companyEmail: 'info@specialized.com',
        location: 'California, USA',
        contacts: []
      },
      {
        companyName: 'Giant Manufacturing Co.',
        boothNo: 'B1-300',
        website: 'https://giant-bicycles.com',
        companyEmail: 'contact@giant.com.tw',
        location: 'Taiwan',
        contacts: []
      },
      {
        companyName: 'Bosch eBike Systems',
        boothNo: 'B1-320',
        website: 'https://bosch-ebike.com',
        companyEmail: 'info@bosch.com',
        location: 'Stuttgart, Germany',
        contacts: []
      },
      {
        companyName: 'Continental Bicycle Tires',
        boothNo: 'C1-400',
        website: 'https://continental-tires.com',
        companyEmail: 'bike@conti.de',
        location: 'Hannover, Germany',
        contacts: []
      },
      {
        companyName: 'Garmin International',
        boothNo: 'C2-450',
        website: 'https://garmin.com',
        companyEmail: 'cycling@garmin.com',
        location: 'Kansas, USA',
        contacts: []
      },
      {
        companyName: 'Mavic SAS',
        boothNo: 'D1-500',
        website: 'https://mavic.com',
        companyEmail: 'contact@mavic.com',
        location: 'Annecy, France',
        contacts: []
      },
      {
        companyName: 'Fox Factory Inc.',
        boothNo: 'D1-520',
        website: 'https://ridefox.com',
        companyEmail: 'info@fox.com',
        location: 'Georgia, USA',
        contacts: []
      },
      {
        companyName: 'RockShox',
        boothNo: 'D2-550',
        website: 'https://rockshox.com',
        companyEmail: 'support@rockshox.com',
        location: 'Colorado, USA',
        contacts: []
      },
      {
        companyName: 'Schwalbe Tires',
        boothNo: 'E1-600',
        website: 'https://schwalbe.com',
        companyEmail: 'info@schwalbe.de',
        location: 'Germany',
        contacts: []
      },
      {
        companyName: 'Campagnolo S.r.l.',
        boothNo: 'E2-650',
        website: 'https://campagnolo.com',
        companyEmail: 'info@campagnolo.com',
        location: 'Vicenza, Italy',
        contacts: []
      },
      {
        companyName: 'DT Swiss AG',
        boothNo: 'F1-700',
        website: 'https://dtswiss.com',
        companyEmail: 'info@dtswiss.com',
        location: 'Switzerland',
        contacts: []
      },
      {
        companyName: 'FSA (Full Speed Ahead)',
        boothNo: 'F2-750',
        website: 'https://fullspeedahead.com',
        companyEmail: 'contact@fsa.it',
        location: 'Italy',
        contacts: []
      },
      {
        companyName: 'Cannondale Bicycle Corporation',
        boothNo: 'G1-800',
        website: 'https://cannondale.com',
        companyEmail: 'info@cannondale.com',
        location: 'Connecticut, USA',
        contacts: []
      },
      {
        companyName: 'Scott Sports SA',
        boothNo: 'G2-850',
        website: 'https://scott-sports.com',
        companyEmail: 'info@scott-sports.com',
        location: 'Switzerland',
        contacts: []
      },
      {
        companyName: 'BMC Switzerland AG',
        boothNo: 'H1-900',
        website: 'https://bmc-switzerland.com',
        companyEmail: 'info@bmc-switzerland.com',
        location: 'Grenchen, Switzerland',
        contacts: []
      },
      {
        companyName: 'Cervélo Cycles',
        boothNo: 'H2-950',
        website: 'https://cervelo.com',
        companyEmail: 'info@cervelo.com',
        location: 'Toronto, Canada',
        contacts: []
      },
      {
        companyName: 'Pinarello Cicli',
        boothNo: 'I1-1000',
        website: 'https://pinarello.com',
        companyEmail: 'info@pinarello.it',
        location: 'Treviso, Italy',
        contacts: []
      }
    ];
  }

  // Puppeteer crawler for real web scraping with custom URLs
  async runWithPuppeteer(userId, companyId, tradeShow) {
    try {
      const job = await CrawlerJob.findOne({ jobId: this.jobId });
      await job.addLog('Starting real web scraping with Puppeteer...', 'info');

      // Configure Puppeteer crawler
      const crawler = new PuppeteerCrawler({
        maxRequestsPerCrawl: 9999, // Allow unlimited pages for complete trade show extraction
        requestHandlerTimeoutSecs: 90,
        maxConcurrency: 1, // Sequential processing - one page at a time
        launchContext: {
          launchOptions: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-blink-features=AutomationControlled'
            ]
          }
        },

        requestHandler: async ({ request, page, log }) => {
          // Check if crawler should stop
          if (this.shouldStop) {
            log.info('Crawler stopped by user');
            return;
          }

          // Handle pause
          while (this.isPaused && !this.shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Get page number from request
          const pageNumber = request.userData.pageNumber || 1;

          // LIST PAGE EXTRACTION - Simple mode: Company Name, Booth No, Hall No, Website only
          await job.addLog(`Processing Page ${pageNumber}...`, 'info');

          try {
            // Set extra headers to avoid detection
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'en-US,en;q=0.9'
            });

            // Wait for page to load
            await page.waitForSelector('body', { timeout: 15000 });

            // Wait longer for JavaScript-heavy sites (like Ambiente Frankfurt)
            await job.addLog('Waiting for dynamic content to load...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Extended wait

            // Try to detect when content is loaded by waiting for common exhibitor containers
            try {
              await page.waitForSelector(
                '.exhibitor, .company, article, .result, .listing, [class*="exhibitor"], [class*="result"]',
                { timeout: 10000 }
              );
              await job.addLog('Dynamic content detected!', 'info');
            } catch (e) {
              await job.addLog('No specific exhibitor containers found, proceeding with extraction...', 'info');
            }

            await job.addLog('Page loaded, extracting exhibitor data...', 'info');

            // Extract exhibitor data - SIMPLE MODE: Company Name, Booth No, Hall No, Website ONLY
            let exhibitorData = await page.evaluate(() => {
              const items = [];

              // Helper function to clean booth/hall number
              const cleanBoothNumber = (text) => {
                if (!text) return '';
                return text.replace(/^(booth|stand|hall|pavilion)[:\s]*/gi, '').trim();
              };

              // Helper function to extract URL
              const extractUrlFromText = (text) => {
                if (!text) return '';
                const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
                const match = text.match(urlRegex);
                return match ? match[0] : '';
              };

              // Try multiple selectors for exhibitor listings
              const exhibitorCards = document.querySelectorAll(
                '.exhibitor-card, .company-card, [data-exhibitor], .exhibitor-item, .listing-card, .company-listing, .exhibitor, [class*="exhibitor"], .company-item, [class*="company"], article.exhibitor, div.exhibitor'
              );

              console.log('Found exhibitor cards:', exhibitorCards.length);

              exhibitorCards.forEach((card, index) => {
                try {
                  const cardText = card.textContent || '';

                  // Extract company name
                  const name =
                    card.querySelector('.company-name')?.textContent?.trim() ||
                    card.querySelector('.exhibitor-name')?.textContent?.trim() ||
                    card.querySelector('h1')?.textContent?.trim() ||
                    card.querySelector('h2')?.textContent?.trim() ||
                    card.querySelector('h3')?.textContent?.trim() ||
                    card.querySelector('h4')?.textContent?.trim() ||
                    card.querySelector('.name')?.textContent?.trim() ||
                    card.querySelector('[class*="name"]')?.textContent?.trim() ||
                    card.querySelector('strong')?.textContent?.trim() ||
                    '';

                  // Extract booth/hall number
                  let boothNo =
                    card.querySelector('.booth')?.textContent?.trim() ||
                    card.querySelector('.stand')?.textContent?.trim() ||
                    card.querySelector('.hall')?.textContent?.trim() ||
                    card.querySelector('[class*="booth"]')?.textContent?.trim() ||
                    card.querySelector('[class*="stand"]')?.textContent?.trim() ||
                    card.querySelector('[class*="hall"]')?.textContent?.trim() ||
                    card.querySelector('[data-booth]')?.getAttribute('data-booth')?.trim() ||
                    card.querySelector('[data-stand]')?.getAttribute('data-stand')?.trim() ||
                    '';
                  boothNo = cleanBoothNumber(boothNo);

                  // Extract website
                  let website =
                    card.querySelector('a.website')?.href ||
                    card.querySelector('a[class*="website"]')?.href ||
                    card.querySelector('a[href*="www"]')?.href ||
                    card.querySelector('a[href^="http"]')?.href ||
                    extractUrlFromText(cardText) ||
                    '';

                  // Clean website URL
                  if (website && !website.startsWith('http')) {
                    website = 'https://' + website.replace(/^www\./, '');
                  }

                  // Only push if we have at least a company name
                  if (name && name.length > 2) {
                    items.push({
                      name: name,
                      boothNo: boothNo,
                      website: website
                    });
                  }
                } catch (e) {
                  console.error('Error extracting exhibitor:', e);
                }
              });

              // Also try table rows if no cards found
              if (items.length === 0) {
                const rows = document.querySelectorAll('tr, .table-row, [class*="row"]');
                rows.forEach(row => {
                  const cells = row.querySelectorAll('td, .cell, [class*="cell"]');
                  if (cells.length >= 2) {
                    const rowText = row.textContent || '';
                    const name = cells[0]?.textContent?.trim() || cells[1]?.textContent?.trim();

                    if (name && name.length > 2 && !name.toLowerCase().includes('company') && !name.toLowerCase().includes('exhibitor')) {
                      const boothNo = cleanBoothNumber(cells[1]?.textContent?.trim() || cells[2]?.textContent?.trim() || '');
                      const website = row.querySelector('a[href^="http"]')?.href || extractUrlFromText(rowText) || '';

                      items.push({
                        name: name,
                        boothNo: boothNo,
                        website: website
                      });
                    }
                  }
                });
              }

              return items;
            });

            await job.addLog(`Found ${exhibitorData.length} potential exhibitors`, 'info');

            // If still no data, log the page structure for debugging
            if (exhibitorData.length === 0) {
              const pageStructure = await page.evaluate(() => {
                return {
                  title: document.title,
                  bodyClasses: document.body.className,
                  mainDivs: Array.from(document.querySelectorAll('div[class]')).slice(0, 10).map(d => d.className),
                  links: Array.from(document.querySelectorAll('a')).slice(0, 5).map(a => ({
                    text: a.textContent?.trim(),
                    href: a.href
                  }))
                };
              });
              await job.addLog(`Page structure: ${JSON.stringify(pageStructure)}`, 'warning');
              await job.addLog('No exhibitors found - website structure may have changed or requires authentication', 'warning');
            }

            // Process extracted data
            if (Array.isArray(exhibitorData) && exhibitorData.length > 0) {
              await job.addLog(`Processing ${exhibitorData.length} exhibitors from page ${pageNumber}`, 'info');

              for (const item of exhibitorData) {
                try {
                  const exhibitor = {
                    companyName: item.name || 'N/A',
                    boothNo: item.boothNo || '',
                    website: item.website || '',
                    companyEmail: '',
                    location: '',
                    contacts: []
                  };

                  // Save or merge exhibitor
                  const result = await this.saveOrMergeExhibitor(
                    exhibitor,
                    tradeShow._id,
                    userId,
                    companyId
                  );

                  job.recordsExtracted += 1;

                  // Create log message
                  const dataDetails = [];
                  if (exhibitor.boothNo) dataDetails.push(`Booth: ${exhibitor.boothNo}`);
                  if (exhibitor.website) dataDetails.push(`Website: ${exhibitor.website}`);
                  const detailsStr = dataDetails.length > 0 ? ` | ${dataDetails.join(' | ')}` : '';

                  if (result === 'created') {
                    job.recordsSaved += 1;
                    await job.addLog(`✓ ${exhibitor.companyName}${detailsStr}`, 'success');
                  } else if (result === 'merged') {
                    job.recordsMerged += 1;
                    await job.addLog(`⟲ ${exhibitor.companyName}${detailsStr}`, 'info');
                  }

                  await job.save();
                } catch (error) {
                  await job.addError(`Error processing exhibitor: ${error.message}`, pageNumber);
                }
              }

              // Update progress
              const progress = Math.round((pageNumber / this.config.maxPages) * 100);
              await job.updateProgress(progress, pageNumber, job.recordsExtracted);

              // Emit real-time progress
              this.emitProgress({
                progress,
                currentPage: pageNumber,
                totalPages: this.config.maxPages,
                recordsExtracted: job.recordsExtracted,
                recordsSaved: job.recordsSaved,
                recordsMerged: job.recordsMerged,
                status: 'running'
              });
            } else {
              await job.addLog(`No exhibitors found on page ${pageNumber}`, 'warning');
            }

          } catch (e) {
            await job.addLog(`Error on page ${pageNumber}: ${e.message}`, 'error');
          }

          // Handle pagination - CLICK to next page
          const nextPageNumber = pageNumber + 1;
          if (nextPageNumber <= this.config.maxPages && !this.shouldStop) {
            await job.addLog(`Checking for next page (page ${nextPageNumber})...`, 'info');

            try {
              // Try to find and CLICK the next page button with multiple selectors
              const nextPageInfo = await page.evaluate(() => {
                // Comprehensive list of next button selectors
                const selectors = [
                  'button.next',
                  'a.next',
                  'button.pagination-next',
                  'a.pagination-next',
                  '[rel="next"]',
                  '[aria-label="Next"]',
                  '[aria-label="Next page"]',
                  'a[href*="page="]',
                  'button[aria-label*="next" i]',
                  'a[aria-label*="next" i]',
                  '.pagination .next',
                  '.pagination a:last-child',
                  'button:has-text("Next")',
                  'a:has-text("Next")',
                  '[class*="next"]',
                  '[class*="pagination"] button:last-child',
                  '[class*="pagination"] a:last-child',
                  'nav[role="navigation"] button:last-child',
                  'nav[role="navigation"] a:last-child'
                ];

                for (const selector of selectors) {
                  try {
                    const btn = document.querySelector(selector);
                    if (btn && !btn.disabled && !btn.classList.contains('disabled')) {
                      // Check if it's actually a "next" button (not "previous")
                      const text = btn.textContent?.toLowerCase() || '';
                      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

                      if (
                        text.includes('next') ||
                        text.includes('→') ||
                        text.includes('›') ||
                        text.includes('»') ||
                        ariaLabel.includes('next') ||
                        selector.includes('next')
                      ) {
                        return {
                          found: true,
                          selector: selector,
                          text: btn.textContent?.trim(),
                          isLink: btn.tagName === 'A',
                          href: btn.href || null
                        };
                      }
                    }
                  } catch (e) {
                    continue;
                  }
                }
                return { found: false };
              });

              if (nextPageInfo.found) {
                await job.addLog(`Found next page button: "${nextPageInfo.text}" (${nextPageInfo.selector})`, 'success');

                // Method 1: If it's a link with href, navigate directly
                if (nextPageInfo.isLink && nextPageInfo.href) {
                  await job.addLog(`Navigating to next page via link: ${nextPageInfo.href}`, 'info');
                  await crawler.addRequests([{
                    url: nextPageInfo.href,
                    userData: { pageNumber: nextPageNumber }
                  }]);
                } else {
                  // Method 2: Click the button and wait for navigation/content update
                  await job.addLog(`Clicking next page button...`, 'info');

                  const clicked = await page.evaluate((selector) => {
                    const btn = document.querySelector(selector);
                    if (btn) {
                      btn.click();
                      return true;
                    }
                    return false;
                  }, nextPageInfo.selector);

                  if (clicked) {
                    // Wait for either navigation or new content to load
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Get the new URL after click
                    const newUrl = page.url();
                    await job.addLog(`After click, current URL: ${newUrl}`, 'info');

                    // Queue the new page
                    await crawler.addRequests([{
                      url: newUrl,
                      userData: { pageNumber: nextPageNumber }
                    }]);
                  }
                }
              } else {
                await job.addLog('No next page button found - reached last page', 'info');
              }
            } catch (e) {
              await job.addLog(`Pagination error: ${e.message}`, 'warning');
            }
          } else if (nextPageNumber > this.config.maxPages) {
            await job.addLog(`Reached maximum pages limit (${this.config.maxPages})`, 'info');
          }
        }
      });

      // Start crawling from page 1
      const startUrl = this.getTargetUrl();
      await job.addLog(`Target URL: ${startUrl}`, 'info');
      await crawler.run([{
        url: startUrl,
        userData: { pageNumber: 1 }
      }]);

      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      await job.save();
      await job.addLog(
        `Crawler completed! Extracted: ${job.recordsExtracted}, Saved: ${job.recordsSaved}, Merged: ${job.recordsMerged}`,
        'success'
      );

      // Emit completion
      this.emitProgress({
        progress: 100,
        status: 'completed',
        recordsExtracted: job.recordsExtracted,
        recordsSaved: job.recordsSaved,
        recordsMerged: job.recordsMerged
      });

    } catch (error) {
      const job = await CrawlerJob.findOne({ jobId: this.jobId });
      if (job) {
        job.status = 'failed';
        job.completedAt = new Date();
        await job.save();
        await job.addError(`Crawler failed: ${error.message}`);
      }
      throw error;
    }
  }

}

module.exports = NoxtmExhibitorCrawler;
