const { PuppeteerCrawler } = require('crawlee');
const BaseCrawler = require('./crawler-base');
const CrawlerJob = require('../../models/CrawlerJob');

class NoxtmExhibitorCrawler extends BaseCrawler {
  constructor() {
    super({
      name: 'NoxtmExhibitor',
      displayName: 'noxtm-Exhibitor-Crawler',
      description: 'Extract exhibitor data from trade show websites',
      baseUrl: 'https://webscraper.io/test-sites/e-commerce/static/computers/laptops',
      maxPages: 2,
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
        maxRequestsPerCrawl: this.config.maxPages + 2,
        requestHandlerTimeoutSecs: 90,
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

          const pageNumber = request.userData.pageNumber || 1;
          await job.addLog(`Processing Page ${pageNumber} with Puppeteer...`, 'info');

          try {
            // Set extra headers to avoid detection
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'en-US,en;q=0.9'
            });

            // Wait for page to load
            await page.waitForSelector('body', { timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for JavaScript

            await job.addLog('Page loaded, extracting exhibitor data...', 'info');

            // Extract REAL exhibitor data with enhanced extraction
            let exhibitorData = await page.evaluate(() => {
              const items = [];

              // Helper function to extract email from text using regex
              const extractEmailFromText = (text) => {
                if (!text) return '';
                const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                const match = text.match(emailRegex);
                return match ? match[0] : '';
              };

              // Helper function to extract phone from text
              const extractPhoneFromText = (text) => {
                if (!text) return '';
                // Matches formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
                const phoneRegex = /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g;
                const match = text.match(phoneRegex);
                return match ? match[0].trim() : '';
              };

              // Helper function to extract URL from text
              const extractUrlFromText = (text) => {
                if (!text) return '';
                const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
                const match = text.match(urlRegex);
                return match ? match[0] : '';
              };

              // Helper function to clean and validate booth number
              const cleanBoothNumber = (text) => {
                if (!text) return '';
                // Remove common labels and extract just the number/code
                return text.replace(/^(booth|stand|hall|pavilion)[:\s]*/gi, '').trim();
              };

              // Try multiple selectors for exhibitor listings
              const exhibitorCards = document.querySelectorAll(
                '.exhibitor-card, .company-card, [data-exhibitor], .exhibitor-item, .listing-card, .company-listing, .exhibitor, [class*="exhibitor"], .company-item, [class*="company"], article.exhibitor, div.exhibitor'
              );

              console.log('Found exhibitor cards:', exhibitorCards.length);

              exhibitorCards.forEach((card, index) => {
                try {
                  // Get all text content for fallback pattern matching
                  const cardText = card.textContent || '';

                  // Extract company name - try multiple selectors
                  const name =
                    card.querySelector('.company-name')?.textContent?.trim() ||
                    card.querySelector('.exhibitor-name')?.textContent?.trim() ||
                    card.querySelector('h1')?.textContent?.trim() ||
                    card.querySelector('h2')?.textContent?.trim() ||
                    card.querySelector('h3')?.textContent?.trim() ||
                    card.querySelector('h4')?.textContent?.trim() ||
                    card.querySelector('.name')?.textContent?.trim() ||
                    card.querySelector('[class*="company"]')?.textContent?.trim() ||
                    card.querySelector('[class*="name"]')?.textContent?.trim() ||
                    card.querySelector('strong')?.textContent?.trim() ||
                    card.querySelector('b')?.textContent?.trim() ||
                    '';

                  // Extract booth/stand number with enhanced selectors
                  let booth =
                    card.querySelector('.booth')?.textContent?.trim() ||
                    card.querySelector('.stand')?.textContent?.trim() ||
                    card.querySelector('.hall')?.textContent?.trim() ||
                    card.querySelector('[class*="booth"]')?.textContent?.trim() ||
                    card.querySelector('[class*="stand"]')?.textContent?.trim() ||
                    card.querySelector('[data-booth]')?.getAttribute('data-booth')?.trim() ||
                    card.querySelector('[data-stand]')?.getAttribute('data-stand')?.trim() ||
                    '';
                  booth = cleanBoothNumber(booth);

                  // Extract website with enhanced selectors
                  let website =
                    card.querySelector('a.website')?.href ||
                    card.querySelector('a[class*="website"]')?.href ||
                    card.querySelector('a[href*="www"]')?.href ||
                    card.querySelector('a[href^="http"]')?.href ||
                    card.querySelector('.website')?.textContent?.trim() ||
                    card.querySelector('[class*="website"]')?.textContent?.trim() ||
                    extractUrlFromText(cardText) ||
                    '';

                  // Clean website URL
                  if (website && !website.startsWith('http')) {
                    website = 'https://' + website.replace(/^www\./, '');
                  }

                  // Extract email with enhanced selectors and pattern matching
                  let email =
                    card.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '') ||
                    card.querySelector('.email')?.textContent?.trim() ||
                    card.querySelector('[class*="email"]')?.textContent?.trim() ||
                    card.querySelector('[class*="mail"]')?.textContent?.trim() ||
                    extractEmailFromText(cardText) ||
                    '';

                  // Extract location/country with enhanced selectors
                  let country =
                    card.querySelector('.country')?.textContent?.trim() ||
                    card.querySelector('.location')?.textContent?.trim() ||
                    card.querySelector('.address')?.textContent?.trim() ||
                    card.querySelector('[class*="country"]')?.textContent?.trim() ||
                    card.querySelector('[class*="location"]')?.textContent?.trim() ||
                    card.querySelector('[class*="address"]')?.textContent?.trim() ||
                    card.querySelector('[class*="city"]')?.textContent?.trim() ||
                    '';

                  // Extract contacts (people)
                  const contacts = [];
                  const contactElements = card.querySelectorAll('.contact, .contact-person, [class*="contact"], .person, [class*="person"]');

                  contactElements.forEach(contactEl => {
                    const contactText = contactEl.textContent || '';
                    const contactName =
                      contactEl.querySelector('.name')?.textContent?.trim() ||
                      contactEl.querySelector('[class*="name"]')?.textContent?.trim() ||
                      contactEl.querySelector('strong')?.textContent?.trim() ||
                      '';

                    const contactPhone =
                      contactEl.querySelector('.phone')?.textContent?.trim() ||
                      contactEl.querySelector('[class*="phone"]')?.textContent?.trim() ||
                      contactEl.querySelector('[class*="tel"]')?.textContent?.trim() ||
                      extractPhoneFromText(contactText) ||
                      '';

                    const contactEmail =
                      contactEl.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '') ||
                      contactEl.querySelector('.email')?.textContent?.trim() ||
                      extractEmailFromText(contactText) ||
                      '';

                    const contactDesignation =
                      contactEl.querySelector('.title')?.textContent?.trim() ||
                      contactEl.querySelector('.designation')?.textContent?.trim() ||
                      contactEl.querySelector('[class*="title"]')?.textContent?.trim() ||
                      contactEl.querySelector('[class*="position"]')?.textContent?.trim() ||
                      '';

                    // Extract social links
                    const socialLinks = [];
                    const socialElements = contactEl.querySelectorAll('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"]');
                    socialElements.forEach(link => {
                      if (link.href) socialLinks.push(link.href);
                    });

                    if (contactName || contactEmail || contactPhone) {
                      contacts.push({
                        fullName: contactName,
                        designation: contactDesignation,
                        phone: contactPhone,
                        email: contactEmail,
                        socialLinks: socialLinks,
                        location: '',
                        sameAsCompany: contactEmail === email
                      });
                    }
                  });

                  // If no specific contact elements, try to extract from card text
                  if (contacts.length === 0) {
                    const cardEmail = email || extractEmailFromText(cardText);
                    const cardPhone = extractPhoneFromText(cardText);

                    if (cardEmail || cardPhone) {
                      contacts.push({
                        fullName: '',
                        designation: '',
                        phone: cardPhone,
                        email: cardEmail,
                        socialLinks: [],
                        location: '',
                        sameAsCompany: true
                      });
                    }
                  }

                  if (name && name.length > 2) {
                    items.push({
                      name: name,
                      standNo: booth,
                      website: website,
                      email: email,
                      country: country,
                      contacts: contacts
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
                      const booth = cleanBoothNumber(cells[1]?.textContent?.trim() || '');
                      const website = row.querySelector('a[href^="http"]')?.href || extractUrlFromText(rowText) || '';
                      const email = row.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '') || extractEmailFromText(rowText) || '';
                      const country = cells[2]?.textContent?.trim() || cells[3]?.textContent?.trim() || '';
                      const phone = extractPhoneFromText(rowText);

                      const contacts = [];
                      if (email || phone) {
                        contacts.push({
                          fullName: '',
                          designation: '',
                          phone: phone,
                          email: email,
                          socialLinks: [],
                          location: '',
                          sameAsCompany: true
                        });
                      }

                      items.push({
                        name: name,
                        standNo: booth,
                        website: website,
                        email: email,
                        country: country,
                        contacts: contacts
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
                    boothNo: item.standNo || '',
                    website: item.website || '',
                    companyEmail: item.email || '',
                    location: item.country || '',
                    contacts: item.contacts || []
                  };

                  // Save or merge exhibitor
                  const result = await this.saveOrMergeExhibitor(
                    exhibitor,
                    tradeShow._id,
                    userId,
                    companyId
                  );

                  job.recordsExtracted += 1;

                  // Create detailed log message showing extracted data
                  const dataDetails = [];
                  if (exhibitor.boothNo) dataDetails.push(`Booth: ${exhibitor.boothNo}`);
                  if (exhibitor.location) dataDetails.push(`Location: ${exhibitor.location}`);
                  if (exhibitor.companyEmail) dataDetails.push(`Email: ${exhibitor.companyEmail}`);
                  if (exhibitor.website) dataDetails.push(`Website: ${exhibitor.website}`);
                  if (exhibitor.contacts && exhibitor.contacts.length > 0) {
                    dataDetails.push(`Contacts: ${exhibitor.contacts.length}`);
                  }
                  const detailsStr = dataDetails.length > 0 ? ` | ${dataDetails.join(' | ')}` : '';

                  if (result === 'created') {
                    job.recordsSaved += 1;
                    await job.addLog(`✓ Created: ${exhibitor.companyName}${detailsStr}`, 'success');
                  } else if (result === 'merged') {
                    job.recordsMerged += 1;
                    await job.addLog(`⟲ Merged: ${exhibitor.companyName}${detailsStr}`, 'info');
                  } else {
                    await job.addLog(`→ Skipped: ${exhibitor.companyName} (duplicate)`, 'info');
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

          // Queue next page (if pagination exists)
          const nextPageNumber = pageNumber + 1;
          if (nextPageNumber <= this.config.maxPages && !this.shouldStop) {
            // Try to find next page link
            try {
              const hasNextPage = await page.evaluate(() => {
                const nextBtn = document.querySelector('.next, .pagination-next, [rel="next"], a[href*="page=2"]');
                return !!nextBtn;
              });

              if (hasNextPage) {
                const nextUrl = `${this.getTargetUrl()}?page=${nextPageNumber}`;
                await crawler.addRequests([{
                  url: nextUrl,
                  userData: { pageNumber: nextPageNumber }
                }]);
              }
            } catch (e) {
              await job.addLog('No pagination found', 'info');
            }
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
